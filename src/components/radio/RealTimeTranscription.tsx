
import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRealTimeTranscription, UtteranceTimestamp } from "@/hooks/useRealTimeTranscription";
import { RealTimeSpeakerSegment } from "./RealTimeSpeakerSegment";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface RealTimeTranscriptionProps {
  transcriptionId?: string;
  onTranscriptionComplete?: (text: string) => void;
  onUtterancesReceived?: (utterances: any[]) => void;
  onSeek?: (timestamp: number) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
}

export const RealTimeTranscription: React.FC<RealTimeTranscriptionProps> = ({
  transcriptionId,
  onTranscriptionComplete,
  onUtterancesReceived,
  onSeek,
  isPlaying = false,
  currentTime = 0,
  onPlayPause
}) => {
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState<number>(-1);
  const utteranceRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  
  const {
    isProcessing,
    progress,
    transcription,
    utterances,
    currentWordIndex,
    startFromMicrophone,
    stopTranscription,
    updateHighlight
  } = useRealTimeTranscription({
    onTranscriptionComplete,
    onUtterancesReceived
  });

  // Update real-time highlighting when audio is playing
  useEffect(() => {
    if (isPlaying && currentTime > 0 && updateHighlight) {
      updateHighlight(currentTime);
    }
  }, [isPlaying, currentTime, updateHighlight]);

  // Set up refs for each utterance segment
  useEffect(() => {
    utteranceRefs.current = utterances.map((_, i) => 
      utteranceRefs.current[i] || React.createRef()
    );
  }, [utterances.length]);

  // Scroll to active speaker segment
  useEffect(() => {
    if (activeSpeakerIdx >= 0 && utteranceRefs.current[activeSpeakerIdx]?.current) {
      utteranceRefs.current[activeSpeakerIdx].current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeSpeakerIdx]);

  const handleStartRecording = async () => {
    try {
      await startFromMicrophone();
      toast.success("Grabación iniciada");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("No se pudo iniciar la grabación");
    }
  };

  const handleStopRecording = () => {
    try {
      stopTranscription();
      toast.success("Grabación finalizada");
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast.error("Error al detener la grabación");
    }
  };

  const handleSegmentClick = (utterance: UtteranceTimestamp, index: number) => {
    setActiveSpeakerIdx(index);
    
    if (onSeek && typeof utterance.start === 'number') {
      onSeek(utterance.start);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {isProcessing ? (
            <Button 
              variant="destructive" 
              onClick={handleStopRecording}
              className="gap-2"
            >
              <MicOff size={16} />
              Detener grabación
            </Button>
          ) : (
            <Button 
              onClick={handleStartRecording}
              className="gap-2"
            >
              <Mic size={16} />
              Iniciar grabación
            </Button>
          )}
        </div>
        
        {isProcessing && (
          <Badge variant="outline" className="gap-2">
            <Loader2 size={14} className="animate-spin" />
            Procesando: {progress}%
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {utterances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Mic size={48} className="mb-2 opacity-50" />
              <p className="text-lg font-medium">No hay transcripción en tiempo real</p>
              <p className="text-sm">Presione "Iniciar grabación" para comenzar</p>
            </div>
          ) : (
            <div className="h-96 overflow-y-auto space-y-4">
              {utterances.map((utterance, idx) => (
                <RealTimeSpeakerSegment
                  key={`${utterance.speaker}-${idx}`}
                  utterance={utterance}
                  isActive={activeSpeakerIdx === idx}
                  currentWordIndex={idx === activeSpeakerIdx ? currentWordIndex : -1}
                  onClick={() => handleSegmentClick(utterance, idx)}
                  refProp={utteranceRefs.current[idx]}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
