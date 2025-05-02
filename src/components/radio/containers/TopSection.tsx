
import React from "react";
import ClearAllButton from "../ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface TopSectionProps {
  handleClearAll: () => void;
  files: File[];
  transcriptionText: string;
  isClearing?: boolean;
}

const TopSection = ({
  handleClearAll,
  files,
  transcriptionText,
  isClearing = false
}: TopSectionProps) => (
  <ErrorBoundary>
    <div className="flex justify-end mb-2">
      <ClearAllButton 
        onClearAll={handleClearAll}
        isClearing={isClearing}
      />
    </div>
  </ErrorBoundary>
);

export default TopSection;
