"use client";

import { useState } from 'react';

export default function ImageUploader({ images, setImages, max = 6 }) {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (event) => {
    try {
      setUploading(true);
      const files = Array.from(event.target.files);
      
      if (images.length + files.length > max) {
        alert(`You can only upload up to ${max} images.`);
        return;
      }

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        alert('Cloudinary environment variables are missing! Check .env.local');
        setUploading(false);
        return;
      }

      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        // Upload directly to Cloudinary REST API
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || 'Cloudinary upload failed');
        }

        const data = await response.json();
        return data.secure_url; // Return the secure URL from Cloudinary
      });

      const urls = await Promise.all(uploadPromises);
      setImages([...images, ...urls]);
    } catch (error) {
      alert(`Error uploading image! ${error.message}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {images.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Listing" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm hover:bg-destructive/90"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < max && (
          <div className="w-24 h-24 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center relative cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
            <span className="text-muted-foreground text-sm flex flex-col items-center">
              <span className="text-xl mb-1">+</span> Add Photo
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={uploadImage}
              disabled={uploading}
            />
          </div>
        )}
      </div>
      {uploading && <p className="text-sm text-muted-foreground animate-pulse">Uploading to Cloudinary...</p>}
    </div>
  );
}
