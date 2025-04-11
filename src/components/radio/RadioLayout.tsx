
import { ReactNode } from "react";
import AuthCheck from "./AuthCheck";
import TypeformAlert from "./TypeformAlert";

interface RadioLayoutProps {
  isAuthenticated: boolean | null;
  leftSection: ReactNode;
  rightSection: ReactNode;
  analysisSection: ReactNode;
  newsSegmentsSection?: ReactNode;
}

// Publimedia brand color
const PUBLIMEDIA_GREEN = "#66cc00";

const RadioLayout = ({
  isAuthenticated,
  leftSection,
  rightSection,
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
        {/* Left section with file upload and media controls */}
        <div className="space-y-4 w-full">
          {leftSection}
        </div>
        {/* Media controls will be on the right side on larger screens */}
      </div>
      
      {/* Second row - Transcription section (full width) */}
      <div className="w-full">
        {rightSection}
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
