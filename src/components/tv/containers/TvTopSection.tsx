import React from "react";
import ClearAllButton from "@/components/radio/ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface UploadedFile extends File {
  preview?: string;
}

interface TvTopSectionProps {
  handleClearAll: () => Promise<boolean>;
  files: UploadedFile[];
  transcriptionText: string;
  clearingProgress?: number;
  clearingStage?: string;
}

const TvTopSection = ({
  handleClearAll,
  files,
  transcriptionText,
  clearingProgress = 0,
  clearingStage = ''
}: TvTopSectionProps) => (
  <ErrorBoundary>
    <div className="flex justify-end mb-2">
      <ClearAllButton 
        onClearAll={handleClearAll}
        clearingProgress={clearingProgress}
        clearingStage={clearingStage}  
      />
    </div>
  </ErrorBoundary>
);

export default TvTopSection;