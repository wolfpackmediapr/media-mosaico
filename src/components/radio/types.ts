
export interface UploadedFile extends File {
  preview?: string;
  id?: string;
  isOptimistic?: boolean;
  isReconstructed?: boolean;
  storagePath?: string;  // Supabase storage path
  storageUrl?: string;   // Public URL from Supabase
}
