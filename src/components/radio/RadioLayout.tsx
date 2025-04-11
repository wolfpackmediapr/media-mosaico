
import { ReactNode } from "react";
import AuthCheck from "./AuthCheck";
import TypeformAlert from "./TypeformAlert";

interface RadioLayoutProps {
  isAuthenticated: boolean | null;
  leftSection: ReactNode;
  rightSection: ReactNode;
  transcriptionSection: ReactNode;  // Renamed for clarity
  analysisSection: ReactNode;
  newsSegmentsSection?: ReactNode;
}

// Publimedia brand color
const PUBLIMEDIA_GREEN = "#66cc00";

const RadioLayout = ({
  isAuthenticated,
  leftSection,
  rightSection,
  transcriptionSection,
  analysisSection,
  newsSegmentsSection
}: RadioLayoutProps) => {
  // Authentication check
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

      {/* Analysis section (already full width) */}
      {analysisSection}

      {/* News segments section if available */}
      {newsSegmentsSection}

      <TypeformAlert isAuthenticated={isAuthenticated} />
    </div>
  );
};

export default RadioLayout;
