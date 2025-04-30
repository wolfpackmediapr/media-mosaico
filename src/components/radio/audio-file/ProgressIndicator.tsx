
import React from 'react';

interface ProgressIndicatorProps {
  isProcessing: boolean;
  progress: number;
  isUploading?: boolean;
  uploadProgress?: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  isProcessing,
  progress,
  isUploading = false,
  uploadProgress = 0
}) => {
  if (!isProcessing && !isUploading) return null;
  
  // Display the appropriate progress bar based on what's happening
  const displayProgress = isUploading ? uploadProgress : progress;
  const statusText = isUploading ? 'Subiendo...' : 'Procesando...';
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{statusText}</span>
        <span>{Math.round(displayProgress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;
