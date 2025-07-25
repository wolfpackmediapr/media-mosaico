// Shared file handling utilities

import { UploadedFile } from '@/types/media';

export const createFileWithPreview = (file: File): UploadedFile => {
  const uploadedFile = file as UploadedFile;
  uploadedFile.preview = URL.createObjectURL(file);
  return uploadedFile;
};

export const revokeFilePreview = (file: UploadedFile): void => {
  if (file.preview) {
    try {
      URL.revokeObjectURL(file.preview);
    } catch (error) {
      console.warn('Failed to revoke blob URL:', error);
    }
  }
};

export const revokeMultipleFilePreviews = (files: UploadedFile[]): void => {
  files.forEach(revokeFilePreview);
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};