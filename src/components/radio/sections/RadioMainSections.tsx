
import { ReactNode } from "react";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface RadioMainSectionsProps {
  transcriptionSection: ReactNode;
  analysisSection: ReactNode;
  newsSegments: RadioNewsSegment[];
  onSeek: (timestamp: number) => void;
  isProcessing: boolean;
  onSegmentsChange: (segments: RadioNewsSegment[]) => void;
}

const RadioMainSections = ({
  transcriptionSection,
  analysisSection,
  newsSegments,
  onSeek,
  isProcessing,
  onSegmentsChange
}: RadioMainSectionsProps) => {
  return (
    <>
      {/* Transcription section */}
      <div className="w-full">
        {transcriptionSection}
      </div>

      {/* Analysis section */}
      {analysisSection}

      {/* News segments section if available */}
      {newsSegments.length > 0 && (
        <div className="w-full">
          <RadioNewsSegmentsContainer
            segments={newsSegments}
            onSegmentsChange={onSegmentsChange}
            onSeek={onSeek}
            isProcessing={isProcessing}
          />
        </div>
      )}
    </>
  );
};

export default RadioMainSections;
