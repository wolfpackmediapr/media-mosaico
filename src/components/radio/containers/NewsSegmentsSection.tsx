
import React from "react";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface NewsSegmentsSectionProps {
  newsSegments: RadioNewsSegment[];
  setNewsSegments: (segments: RadioNewsSegment[]) => void;
  handleSeekToSegment: (timestamp: number) => void;
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
