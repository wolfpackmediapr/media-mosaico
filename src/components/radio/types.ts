
export interface UploadedFile extends File {
  preview?: string; // Blob URL for local preview
  id?: string; // Database ID or unique identifier
  isOptimistic?: boolean; // For UI state during upload
  remoteUrl?: string; // Public URL from storage after upload
  storagePath?: string; // Path in Supabase storage
  isUploaded?: boolean; // Flag indicating if upload is complete
}
