
import { UploadedFile } from "@/components/radio/types";

/**
 * Type guard to check if an object is a valid UploadedFile
 */
export function isUploadedFile(file: any): file is UploadedFile {
  return (
    file !== null &&
    typeof file === 'object' &&
    'name' in file &&
    typeof file.name === 'string'
  );
}

/**
 * Type guard to check if an object has required properties for blob URL conversion
 */
export function hasPreviewProperties(file: any): file is { preview: string; name: string; type: string } {
  return (
    file !== null &&
    typeof file === 'object' &&
    'preview' in file &&
    typeof file.preview === 'string' &&
    'name' in file &&
    typeof file.name === 'string' &&
    'type' in file &&
    typeof file.type === 'string'
  );
}

/**
 * Additional type guard to ensure file is not only a valid UploadedFile 
 * but also has the necessary properties for blob URL reconstruction
 */
export function isReconstructableFile(file: any): file is (UploadedFile & { preview: string; name: string; type: string }) {
  return (
    isUploadedFile(file) && 
    'preview' in file && 
    typeof file.preview === 'string' &&
    'name' in file &&
    typeof file.name === 'string' &&
    'type' in file &&
    typeof file.type === 'string'
  );
}
