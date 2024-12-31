import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload
        const uploadResult = await cloudinary.uploader.upload(
           localFilePath, {
                resource_type: auto
           })
           //file has been uploaded successfully
           console.log("file has been uploaded on cloudinary ", uploadResult.url);
           return uploadResult
    } catch (error) {
        fs.unlink(localFilePath)  //remove locally saved temporary file as upload failed
        return null
    }
}

export {uploadOnCloudinary}