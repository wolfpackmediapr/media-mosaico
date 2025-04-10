
import { useState } from "react";
import AudioProcessing from "./AudioProcessing";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { RadioTranscriptionSlot } from "./transcription";

const RadioContainer = () => {
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<RadioNewsSegment[]>([]);
  const [metadata, setMetadata] = useState({
    emisora: "",
    programa: "",
    horario: "",
    categoria: ""
  });

  const handleSegmentsReceived = (newSegments: RadioNewsSegment[]) => {
    setSegments(newSegments);
  };

  const handleMetadataChange = (newMetadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
  }) => {
    setMetadata(newMetadata);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-6">
        <AudioProcessing 
          onTranscriptionChange={setTranscriptionText}
          onProcessingStateChange={setIsProcessing}
        />
        
        <RadioTranscriptionSlot
          transcriptionText={transcriptionText}
          isProcessing={isProcessing}
          onTranscriptionChange={setTranscriptionText}
          onSegmentsReceived={handleSegmentsReceived}
          metadata={metadata}
          onMetadataChange={handleMetadataChange}
        />
        
        <RadioNewsSegmentsContainer 
          segments={segments} 
          onSegmentsChange={setSegments}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default RadioContainer;
