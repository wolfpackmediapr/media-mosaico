
import React from "react";
import ClearAllButton from "../ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface TopSectionProps {
  handleClearAll: () => void;
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
