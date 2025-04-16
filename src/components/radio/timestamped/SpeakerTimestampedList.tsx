
import { ScrollArea } from "@/components/ui/scroll-area";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatTime } from "./timeUtils";

interface SpeakerTimestampedListProps {
  utterances: UtteranceTimestamp[];
  onUtteranceClick: (timestamp: number) => void;
}

const SpeakerTimestampedList = ({
  utterances,
  onUtteranceClick
}: SpeakerTimestampedListProps) => {
  if (!utterances || utterances.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground">No hay datos de hablantes disponibles</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] rounded-md">
      <div className="space-y-4 p-4">
        {utterances.map((utterance, index) => (
          <div 
            key={`speaker-${utterance.speaker}-${index}`}
            className="border-l-4 border-primary/40 pl-3 hover:border-primary transition-colors"
          >
            <div 
              className="flex items-center gap-2 mb-1 cursor-pointer hover:text-primary"
              onClick={() => onUtteranceClick(utterance.start)}
            >
              <span className="font-semibold">SPEAKER {utterance.speaker}</span>
              <span className="text-xs font-mono bg-primary/10 text-primary px-1 rounded">
                {formatTime(utterance.start)}
              </span>
            </div>
            <p className="text-sm">{utterance.text}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default SpeakerTimestampedList;
