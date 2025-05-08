
import React from "react";
import ClearAllButton from "../ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface TopSectionProps {
  handleClearAll: () => Promise<void>;  // Updated to match ClearAllButton's prop type
  files: File[];
  transcriptionText: string;
}

const TopSection = ({
  handleClearAll,
  files,
  transcriptionText
}: TopSectionProps) => (
  <ErrorBoundary>
    <div className="flex justify-end mb-2">
      <ClearAllButton onClearAll={handleClearAll} />
    </div>
  </ErrorBoundary>
);

export default TopSection;
