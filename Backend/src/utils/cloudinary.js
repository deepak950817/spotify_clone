import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import { ApiError } from './ApiError.js';

dotenv.config({ path: './.env' });

// Cloudinary config
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadOnCloudinary = async (localFilePath, resourceType = "auto") => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType
    });

    fs.unlinkSync(localFilePath); // remove local file
    console.log("✅ Uploaded to Cloudinary:", response.secure_url);
    return response;

  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.error("❌ Cloudinary Upload Error:", error);
    throw new ApiError(500, "Upload failed");
  }
};


const deleteFromCloudinary = async (url, resourceType = "image") => {
  try {
    if (!url.includes("res.cloudinary.com")) {
      throw new ApiError(400, "Invalid Cloudinary URL");
    }

    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(\w+)(?:\?.*)?$/);
    if (!match) {
      throw new ApiError(400, "Invalid Cloudinary URL format");
    }

    const publicId = match[1];
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`✅ Cloudinary deletion result (${resourceType}):`, result);
    return result;

  } catch (error) {
    console.error(`❌ Cloudinary deletion error (${resourceType}):`, error);
    throw new ApiError(500, `Unable to delete ${resourceType} from Cloudinary`);
  }
};

// Specific functions
const deleteImageOnCloudinary = (url) => deleteFromCloudinary(url, "image");
const deleteVideoOnCloudinary = (url) => deleteFromCloudinary(url, "video");
const deleteAudioOnCloudinary = (url) => deleteFromCloudinary(url, "audio");

export { uploadOnCloudinary, deleteImageOnCloudinary, deleteVideoOnCloudinary, deleteAudioOnCloudinary };