import imageCompression from 'browser-image-compression';
import { convertImage } from './image';

export async function compressImageSmart(file: File, targetFormat: 'image/webp' | 'image/jpeg' | 'image/png', quality: number = 0.8): Promise<Blob> {
  const options = {
    maxSizeMB: 5,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: targetFormat,
    initialQuality: quality,
    alwaysKeepResolution: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Fallback to canvas
    return convertImage(file, targetFormat, quality * 100);
  }
}