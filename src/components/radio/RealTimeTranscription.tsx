
import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { useRealTimeTranscription, UtteranceTimestamp } from "@/hooks/useRealTimeTranscription";
import { getSpeakerColor } from "@/components/radio/interactive-transcription/utils";
import { formatTime } from "@/components/radio/timestamped/timeUtils";
import { RealTimeSpeakerSegment } from "@/components/radio/RealTimeSpeakerSegment";
import SpeakerLegend from "./interactive-transcription/SpeakerLegend";

interface RealTimeTranscriptionProps {
  audioFile?: File;
  transcriptionId?: string;
  currentTime?: number;
  isPlaying?: boolean;
  onTranscriptionComplete?: (text: string) => void;
  onUtterancesReceived?: (utterances: UtteranceTimestamp[]) => void;
  onSeek?: (timestamp: number) => void;
  onPlayPause?: () => void;
}

export const RealTimeTranscription: React.FC<RealTimeTranscriptionProps> = ({
  audioFile,
  transcriptionId,
  currentTime = 0,
  isPlaying = false,
  onTranscriptionComplete,
  onUtterancesReceived,
  onSeek,
  onPlayPause,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Use the custom hook for real-time transcription
  const {
    isProcessing,
    progress,
    utterances,
    currentWordIndex,
    startFromMicrophone,
    stopTranscription,
    updateHighlight
  } = useRealTimeTranscription({
    audioFile,
    onTranscriptionComplete,
    onUtterancesReceived,
    languageCode: "es", // Spanish language
    expectedSpeakers: 2
  });

  // Update highlighting based on current playback time
  useEffect(() => {
    if (currentTime > 0 && utterances.length > 0) {
      updateHighlight(currentTime);
    }
  }, [currentTime, utterances, updateHighlight]);

  // Find active segment based on current time
  useEffect(() => {
    if (!utterances.length || currentTime <= 0) return;

    for (const utterance of utterances) {
      // Convert to seconds if needed (AssemblyAI may use milliseconds)
      const start = utterance.start > 1000 ? utterance.start / 1000 : utterance.start;
      const end = utterance.end > 1000 ? utterance.end / 1000 : utterance.end;
      
      if (currentTime >= start && currentTime <= end) {
        setActiveSegmentId(`segment-${utterance.start}-${utterance.end}`);
        break;
      }
    }
  }, [currentTime, utterances]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentId && activeSegmentRef.current && scrollAreaRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeSegmentId]);

  // Handle microphone button click
  const handleMicrophoneToggle = async () => {
    if (isProcessing) {
      stopTranscription();
      toast.info("Transcription stopped");
    } else {
      try {
        await startFromMicrophone();
        toast.info("Listening... Speak now");
      } catch (error) {
        console.error("Error starting microphone:", error);
        toast.error("Failed to access microphone");
      }
    }
  };

  // Determine if we have any utterances to display
  const hasUtterances = utterances && utterances.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium">Transcripción en Tiempo Real</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMicrophoneToggle}
            className={`flex items-center gap-1 ${isProcessing ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50' : ''}`}
          >
            {isProcessing ? (
              <>
                <MicOff className="h-4 w-4" />
                Detener
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Grabar
              </>
            )}
          </Button>
          
          {onPlayPause && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPlayPause}
              className="flex items-center gap-1"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pausar" : "Reproducir"}
            </Button>
          )}
          
          {hasUtterances && <SpeakerLegend utterances={utterances} />}
        </div>
      </div>

      <ScrollArea 
        className="h-[400px] p-4" 
        ref={scrollAreaRef}
      >
        {isProcessing && utterances.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="animate-pulse mb-2">
              <Mic className="h-12 w-12 text-primary" />
            </div>
            <p>Escuchando... {progress > 0 ? `${progress}%` : ''}</p>
          </div>
        )}

        {!isProcessing && utterances.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>No hay transcripción disponible</p>
            <p className="text-sm mt-2">Haga clic en "Grabar" para iniciar la transcripción en tiempo real</p>
          </div>
        )}

        {utterances.length > 0 && (
          <div className="space-y-4">
            {utterances.map((utterance, index) => (
              <RealTimeSpeakerSegment
                key={`${utterance.speaker}-${utterance.start}-${utterance.end}`}
                utterance={utterance}
                isActive={activeSegmentId === `segment-${utterance.start}-${utterance.end}`}
                refProp={activeSegmentId === `segment-${utterance.start}-${utterance.end}` ? activeSegmentRef : undefined}
                currentWordIndex={index === utterances.length - 1 ? currentWordIndex : -1}
                onClick={() => onSeek && onSeek(utterance.start > 1000 ? utterance.start / 1000 : utterance.start)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
