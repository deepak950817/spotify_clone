import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs/promises";
import { ApiError } from "./ApiError.js";

dotenv.config({ path: "./.env" });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, resourceType = "auto") => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
    });

    try {
      await fs.unlink(localFilePath); // cleanup
    } catch (fsErr) {
      console.warn("⚠️ Cleanup failed:", fsErr.message);
    }

    console.log("✅ Uploaded to Cloudinary:", response.secure_url);
    return response;
  } catch (error) {
    try {
      await fs.unlink(localFilePath);
    } catch {}
    console.error("❌ Cloudinary Upload Error:", error);
    throw new ApiError(500, "Upload failed");
  }
};

const deleteFromCloudinary = async (url, resourceType = "image") => {
  try {
    if (!url.includes("res.cloudinary.com")) {
      throw new ApiError(400, "Invalid Cloudinary URL");
    }

    const parts = url.split("/upload/");
    if (parts.length < 2) throw new ApiError(400, "Invalid Cloudinary URL format");

    const publicId = parts[1].split(".")[0];
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`✅ Cloudinary deletion (${resourceType}):`, result);
    return result;
  } catch (error) {
    console.error(`Cloudinary deletion error (${resourceType}):`, error);
    throw new ApiError(500, `Unable to delete ${resourceType} from Cloudinary`);
  }
};

// Export helpers
const deleteImageOnCloudinary = (url) => deleteFromCloudinary(url, "image");
const deleteVideoOnCloudinary = (url) => deleteFromCloudinary(url, "video");
const deleteAudioOnCloudinary = (url) => deleteFromCloudinary(url, "audio");

export {
  uploadOnCloudinary,
  deleteImageOnCloudinary,
  deleteVideoOnCloudinary,
  deleteAudioOnCloudinary,
};
