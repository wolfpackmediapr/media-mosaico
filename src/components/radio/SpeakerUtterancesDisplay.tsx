
import React from "react";
import SpeakerTimestampedList from "./timestamped/SpeakerTimestampedList";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

interface SpeakerUtterancesDisplayProps {
  utterances?: UtteranceTimestamp[];
  onUtteranceClick: (timestamp: number) => void;
}

const SpeakerUtterancesDisplay: React.FC<SpeakerUtterancesDisplayProps> = ({
  utterances,
  onUtteranceClick
}) => {
  if (!utterances || utterances.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground">No hay datos de hablantes disponibles</p>
      </div>
    );
  }

  return (
    <div className="my-4">
      <h3 className="text-md font-semibold mb-2">Vista por Hablantes</h3>
      <SpeakerTimestampedList
        utterances={utterances}
        onUtteranceClick={onUtteranceClick}
      />
    </div>
  );
};

export default SpeakerUtterancesDisplay;
