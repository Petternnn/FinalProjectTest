import { useState } from 'react';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_NAME;
  const uploadPreset = "user_profile"; // As specified

  const uploadImage = async (file) => {
    if (!cloudinaryCloudName) {
      console.error("[useImageUpload]: Cloudinary cloud name (VITE_CLOUDINARY_NAME) is not configured.");
      setUploadError("Cloudinary configuration error. Please contact support.");
      return null;
    }
    if (!file) {
      console.error("[useImageUpload]: No file provided for upload.");
      setUploadError("No file selected.");
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[useImageUpload]: Cloudinary upload failed:", errorData);
        throw new Error(errorData.error?.message || "Image upload failed. Please try again.");
      }

      const data = await response.json();
      console.log("[useImageUpload]: Image uploaded successfully:", data.secure_url);
      setIsUploading(false);
      return data.secure_url;
    } catch (error) {
      console.error("[useImageUpload]: Error during image upload:", error);
      setUploadError(error.message || "An unexpected error occurred during upload.");
      setIsUploading(false);
      return null;
    }
  };

  return { uploadImage, isUploading, uploadError };
}; 