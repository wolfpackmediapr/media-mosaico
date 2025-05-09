
import React from "react";
import ClearAllButton from "../ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface TopSectionProps {
  handleClearAll: () => Promise<void>;
  files: File[];
  transcriptionText: string;
  isClearingAll?: boolean;
  clearProgress?: number;
}

const TopSection = ({
  handleClearAll,
  files,
  transcriptionText,
  isClearingAll = false,
  clearProgress = 0
}: TopSectionProps) => (
  <ErrorBoundary>
    <div className="flex justify-end mb-2">
      <ClearAllButton 
        onClearAll={handleClearAll}
        isClearing={isClearingAll}
        progress={clearProgress} 
      />
    </div>
  </ErrorBoundary>
);

export default TopSection;
