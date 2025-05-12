
import React, { useEffect } from "react";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface NewsSegmentsSectionProps {
  newsSegments: RadioNewsSegment[];
  setNewsSegments: (segments: RadioNewsSegment[]) => void;
  handleSeekToSegment: (segment: RadioNewsSegment) => void;
  isProcessing: boolean;
  lastAction?: string | null; // Add lastAction prop
}

const NewsSegmentsSection = ({
  newsSegments,
  setNewsSegments,
  handleSeekToSegment,
  isProcessing,
  lastAction
}: NewsSegmentsSectionProps) => {
  // Force clear when lastAction is 'clear'
  useEffect(() => {
    if (lastAction === 'clear') {
      console.log('[NewsSegmentsSection] Detected clear action, ensuring segments are reset');
      // Force reset segments if they weren't cleared properly
      if (newsSegments.length > 0) {
        setNewsSegments([]);
      }
    }
  }, [lastAction, newsSegments.length, setNewsSegments]);

  return newsSegments.length > 0 ? (
    <RadioNewsSegmentsContainer
      segments={newsSegments}
      onSegmentsChange={setNewsSegments}
      onSeek={handleSeekToSegment}
      isProcessing={isProcessing}
      forceReset={lastAction === 'clear'} // Pass flag to force reset
    />
  ) : null;
};

export default NewsSegmentsSection;
