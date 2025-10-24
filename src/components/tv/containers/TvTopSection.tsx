import React from "react";
import ClearAllButton from "@/components/radio/ClearAllButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Loader2 } from "lucide-react";
interface UploadedFile extends File {
  preview?: string;
}

interface TvTopSectionProps {
  handleClearAll: () => Promise<boolean>;
  files: UploadedFile[];
  transcriptionText: string;
  clearingProgress?: number;
  clearingStage?: string;
  isProcessing?: boolean;
  progress?: number;
}

const TvTopSection = ({
  handleClearAll,
  files,
  transcriptionText,
  clearingProgress = 0,
  clearingStage = '',
  isProcessing = false,
  progress = 0
}: TvTopSectionProps) => (
  <ErrorBoundary>
    <div className="flex flex-col gap-2">
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            Procesando en segundo plano... {progress}%
          </span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <ClearAllButton 
          onClearAll={handleClearAll}
          clearingProgress={clearingProgress}
          clearingStage={clearingStage}
        />
      </div>
    </div>
  </ErrorBoundary>
);

export default TvTopSection;
