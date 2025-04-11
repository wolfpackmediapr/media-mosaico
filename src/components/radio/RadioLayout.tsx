
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 w-full">
          {leftSection}
        </div>
        <div className="w-full">
          {rightSection}
        </div>
      </div>

      {/* Analysis section now full width - moved outside the grid */}
      {analysisSection}

      {/* News segments section if available */}
      {newsSegmentsSection}

      <TypeformAlert isAuthenticated={isAuthenticated} />
    </div>
  );
};

export default RadioLayout;
