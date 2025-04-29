
import React from "react";
import ClearAllButton from "../ClearAllButton";

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
  <div className="flex justify-end mb-2">
    <ClearAllButton
      onClearAll={handleClearAll}
      disabled={
        files.length === 0 &&
        !transcriptionText
      }
    />
  </div>
);

export default TopSection;
