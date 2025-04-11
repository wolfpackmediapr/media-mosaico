
import { useRef } from "react";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { generateRadioSegments } from "./segments/segmentGenerator";

export const useRadioSegmentGenerator = (
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
) => {
  const segmentsGeneratedRef = useRef(false);
  const transcriptionLength = useRef(0);
  
  const checkAndGenerateSegments = (transcriptionResult: TranscriptionResult | string) => {
    const text = typeof transcriptionResult === 'string' ? transcriptionResult : transcriptionResult.text;
    const currentLength = text?.length || 0;
    const lengthChanged = Math.abs(currentLength - transcriptionLength.current) > 100;
    
    if (text && 
        currentLength > 100 && 
        onSegmentsReceived && 
        (!segmentsGeneratedRef.current || lengthChanged)) {
      
      console.log("Generating segments from transcription:", currentLength, 
                "Previous length:", transcriptionLength.current,
                "Already generated:", segmentsGeneratedRef.current);
      
      generateRadioSegments(transcriptionResult, onSegmentsReceived);
      segmentsGeneratedRef.current = true;
      transcriptionLength.current = currentLength;
      return true;
    }
    
    return false;
  };

  return {
    checkAndGenerateSegments,
    generateRadioSegments: (result: TranscriptionResult | string) => 
      generateRadioSegments(result, onSegmentsReceived)
  };
};
