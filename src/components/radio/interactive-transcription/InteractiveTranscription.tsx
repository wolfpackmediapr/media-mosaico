
import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { ScrollArea } from "@/components/ui/scroll-area";
import SpeakerSegment from "./SpeakerSegment";
import SpeakerLegend from "./SpeakerLegend";
import { calculateCurrentSegment } from "./utils";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface InteractiveTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (timestamp: number) => void;
}

const InteractiveTranscription: React.FC<InteractiveTranscriptionProps> = ({
  transcriptionResult,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
}) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const hasUtterances = transcriptionResult?.utterances && transcriptionResult.utterances.length > 0;

  // Find the active segment based on current playback time
  useEffect(() => {
    if (!hasUtterances || !transcriptionResult?.utterances) return;

    const active = calculateCurrentSegment(transcriptionResult.utterances, currentTime);
    if (active) {
      setActiveSegmentId(`segment-${active.start}-${active.end}`);
    } else {
      setActiveSegmentId(null);
    }
  }, [currentTime, hasUtterances, transcriptionResult?.utterances]);

  // Auto-scroll to active segment with smooth behavior
  useEffect(() => {
    if (activeSegmentId && activeSegmentRef.current && scrollAreaRef.current) {
      activeSegmentRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "center" 
      });
    }
  }, [activeSegmentId]);

  if (!hasUtterances || !transcriptionResult?.utterances) {
    return (
      <Card className="p-4 text-center">
        <p className="text-muted-foreground">
          No hay datos de speaker disponibles para esta transcripción.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium">Transcripción Interactiva</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPlayPause}
            className="flex items-center gap-1"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pausar" : "Reproducir"}
          </Button>
          <SpeakerLegend utterances={transcriptionResult.utterances} />
        </div>
      </div>

      <ScrollArea 
        className="h-[400px] p-4" 
        ref={scrollAreaRef}
      >
        <div className="space-y-4">
          {transcriptionResult.utterances.map((utterance, index) => (
            <SpeakerSegment
              key={`${utterance.speaker}-${utterance.start}-${utterance.end}`}
              utterance={utterance}
              isActive={activeSegmentId === `segment-${utterance.start}-${utterance.end}`}
              refProp={activeSegmentId === `segment-${utterance.start}-${utterance.end}` ? activeSegmentRef : undefined}
              onClick={() => onSeek(utterance.start)}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default InteractiveTranscription;
