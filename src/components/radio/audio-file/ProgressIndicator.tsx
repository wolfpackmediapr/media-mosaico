
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { ProgressIndicatorProps } from './types';

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isProcessing,
  progress
}) => {
  if (!isProcessing) return null;
  
  return (
    <Progress value={progress} className="h-2" />
  );
};

export default ProgressIndicator;
