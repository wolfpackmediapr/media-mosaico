
export interface UploadedFile extends File {
  preview?: string;
  id?: string;
  isOptimistic?: boolean;
}
