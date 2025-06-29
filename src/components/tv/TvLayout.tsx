
import { ReactNode } from "react";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface TvLayoutProps {
  isAuthenticated: boolean | null;
  topSection: ReactNode;
  videoSection: ReactNode;
  transcriptionSection: ReactNode;
  analysisSection: ReactNode;
  notepadSection: ReactNode;
  reportSection: ReactNode;
  typeformSection: ReactNode;
}

const TvLayout = ({
  isAuthenticated,
  topSection,
  videoSection,
  transcriptionSection,
  analysisSection,
  notepadSection,
  reportSection,
  typeformSection
}: TvLayoutProps) => {
  return (
    <div className="w-full space-y-6">
      {/* Top Section with Clear All Button */}
      <ErrorBoundary>
        {topSection}
      </ErrorBoundary>

      {/* Video Upload and Preview Section */}
      <ErrorBoundary>
        {videoSection}
      </ErrorBoundary>
      
      {/* Transcription Section (full width) */}
      <div className="w-full">
        <ErrorBoundary>
          {transcriptionSection}
        </ErrorBoundary>
      </div>

      {/* Analysis Section (full width) */}
      <div className="w-full">
        <ErrorBoundary>
          {analysisSection}
        </ErrorBoundary>
      </div>

      {/* Notepad Section (full width) */}
      <div className="w-full">
        <ErrorBoundary>
          {notepadSection}
        </ErrorBoundary>
      </div>

      {/* Report and Typeform Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          {reportSection}
        </ErrorBoundary>
        <ErrorBoundary>
          {typeformSection}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default TvLayout;
