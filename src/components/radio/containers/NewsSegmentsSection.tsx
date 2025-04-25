
import React from "react";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface NewsSegmentsSectionProps {
  newsSegments: RadioNewsSegment[];
  setNewsSegments: (segments: RadioNewsSegment[]) => void;
  handleSeekToSegment: (segment: RadioNewsSegment) => void; // Changed type from number to RadioNewsSegment
  isProcessing: boolean;
}

const NewsSegmentsSection = ({
  newsSegments,
  setNewsSegments,
  handleSeekToSegment,
  isProcessing
}: NewsSegmentsSectionProps) => 
  newsSegments.length > 0 ? (
    <RadioNewsSegmentsContainer
      segments={newsSegments}
      onSegmentsChange={setNewsSegments}
      onSeek={handleSeekToSegment}
      isProcessing={isProcessing}
    />
  ) : null;

export default NewsSegmentsSection;
