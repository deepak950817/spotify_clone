
 import multer from "multer";
import fs from "fs";
import path from "path";


const uploadFolder = "./public";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});


// const fileFilter = (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();

//   // Allowed extensions
//   const allowedExt = [".jpg", ".jpeg", ".png", ".mp4", ".mp3", ".ogg", ".opus", ".wav"];

//   // Check MIME or fallback on extension
//   if (
//     file.mimetype.startsWith("image/") ||
//     file.mimetype.startsWith("video/") ||
//     file.mimetype.startsWith("audio/") ||
//     (file.mimetype === "application/octet-stream" && allowedExt.includes(ext))
//   ) {
//     cb(null, true);
//   } else {
//     cb(new Error("Unsupported file type"), false);
//   }
// };


  const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image") ||
    file.mimetype.startsWith("video") ||
    file.mimetype.startsWith("audio")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
  }

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, 
  fileFilter,
});


export const uploadMultipleFiles = upload.array("media", 10); // max 10 files per request

