
import { useEffect, useRef } from 'react';
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";
import RadioSegmentGenerator from './RadioSegmentGenerator';

interface RadioTranscriptionGeneratorProps {
  transcriptionText: string;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
}

const RadioTranscriptionGenerator = ({
  transcriptionText, 
  onSegmentsReceived
}: RadioTranscriptionGeneratorProps) => {
  // Use a ref to track if we've already generated segments to prevent infinite loops
  const segmentsGeneratedRef = useRef(false);
  const transcriptionLength = useRef(0);
  
  // Use useEffect to generate segments when transcription text changes significantly
  useEffect(() => {
    // Only attempt to generate segments automatically if:
    // 1. We have transcription text of sufficient length
    // 2. We have a way to send segments back
    // 3. We haven't already generated segments OR the text has changed significantly
    const currentLength = transcriptionText?.length || 0;
    const lengthChanged = Math.abs(currentLength - transcriptionLength.current) > 100;
    
    if (transcriptionText && 
        currentLength > 100 && 
        onSegmentsReceived && 
        (!segmentsGeneratedRef.current || lengthChanged)) {
      
      console.log("Generating segments from transcription:", currentLength, 
               "Previous length:", transcriptionLength.current,
               "Already generated:", segmentsGeneratedRef.current);
      
      // Use our RadioSegmentGenerator logic
      const segmentGenerator = new RadioSegmentGenerator({
        transcriptionText,
        onSegmentsGenerated: (segments) => {
          onSegmentsReceived(segments);
          segmentsGeneratedRef.current = true;
          transcriptionLength.current = currentLength;
        }
      });
      
      segmentGenerator.generateRadioSegments(transcriptionText);
    }
  }, [transcriptionText, onSegmentsReceived]);

  // This component doesn't render anything by itself
  return null;
}

export default RadioTranscriptionGenerator;
