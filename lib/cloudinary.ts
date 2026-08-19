import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads an image buffer to Cloudinary using upload_stream.
 *
 * @param fileBuffer - The Buffer containing the image file data.
 * @param folder - The Cloudinary folder where the asset will be saved (defaults to 'ciirs-listings').
 * @returns The secure URL string of the uploaded photo.
 * @throws Error if upload fails.
 */
export async function uploadWastePhoto(
  fileBuffer: Buffer,
  folder: string = 'ciirs-listings'
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new Error(`Cloudinary upload failed: ${error?.message || 'No result returned from Cloudinary'}`)
          );
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.on('error', (streamError: Error) => {
      reject(new Error(`Cloudinary stream error: ${streamError.message}`));
    });

    uploadStream.end(fileBuffer);
  });
}

export { cloudinary };
