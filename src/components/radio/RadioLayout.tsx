
import { ReactNode } from "react";
import AuthCheck from "./AuthCheck";
import TypeformAlert from "./TypeformAlert";

interface RadioLayoutProps {
  isAuthenticated: boolean | null;
  leftSection: ReactNode;
  rightSection: ReactNode;
  transcriptionSection: ReactNode;  // Renamed for clarity
  notepadSection: ReactNode;        // New notepad section
  analysisSection: ReactNode;
  newsSegmentsSection?: ReactNode;
}

const RadioLayout = ({
  isAuthenticated,
  leftSection,
  rightSection,
  transcriptionSection,
  notepadSection,              // New prop
  analysisSection,
  newsSegmentsSection
}: RadioLayoutProps) => {
  // Show auth check screen if not authenticated, but don't perform auth check itself
  if (isAuthenticated === false || isAuthenticated === null) {
    return <AuthCheck isAuthenticated={isAuthenticated} />;
  }

  return (
    <div className="w-full space-y-6">
      {/* First row - Controls section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left section with file upload */}
        <div className="space-y-4 w-full">
          {leftSection}
        </div>
        {/* Right section with audio files and media controls */}
        <div className="space-y-4 w-full">
          {rightSection}
        </div>
      </div>
      
      {/* Second row - Transcription section (full width) */}
      <div className="w-full">
        {transcriptionSection}
      </div>

      {/* New row - Notepad section (full width) */}
      <div className="w-full">
        {notepadSection}
      </div>

      {/* TypeformAlert moved here - now appears after notepad */}
      <TypeformAlert isAuthenticated={isAuthenticated} />

      {/* Analysis section (already full width) - now after TypeformAlert */}
      {analysisSection}

      {/* News segments section if available - now last */}
      {newsSegmentsSection}
    </div>
  );
};

export default RadioLayout;
