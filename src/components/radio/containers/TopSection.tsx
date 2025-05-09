
import React from "react";
import ClearAllButton from "../ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface TopSectionProps {
  handleClearAll: () => void;
  files: File[];
  transcriptionText: string;
  clearingProgress?: number;
  clearingStage?: string;
}

const TopSection = ({
  handleClearAll,
  files,
  transcriptionText,
  clearingProgress = 0,
  clearingStage = ''
}: TopSectionProps) => (
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

export default TopSection;
