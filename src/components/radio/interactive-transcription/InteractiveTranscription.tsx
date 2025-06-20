
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TranscriptionResult } from '@/services/audio/transcriptionService';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import SpeakerSegment from './SpeakerSegment';
import SpeakerLegend from './SpeakerLegend';
import { normalizeTimeToSeconds } from './utils';

interface InteractiveTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  currentTime?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSeek?: (timestamp: number) => void;
}

const InteractiveTranscription: React.FC<InteractiveTranscriptionProps> = ({
  transcriptionResult,
  currentTime = 0,
  isPlaying = false,
  onPlayPause = () => {},
  onSeek = () => {},
}) => {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const utterances = transcriptionResult?.utterances || [];

  // Find active segment based on current time
  const normalizedCurrentTime = useMemo(() => normalizeTimeToSeconds(currentTime), [currentTime]);

  useEffect(() => {
    if (!utterances.length) return;

    const activeIndex = utterances.findIndex((utterance, index) => {
      const startTime = normalizeTimeToSeconds(utterance.start);
      const endTime = normalizeTimeToSeconds(utterance.end);
      const nextUtteranceStart = index < utterances.length - 1 
        ? normalizeTimeToSeconds(utterances[index + 1].start)
        : Infinity;

      return normalizedCurrentTime >= startTime && 
             normalizedCurrentTime < Math.min(endTime, nextUtteranceStart);
    });

    setActiveSegmentIndex(activeIndex);
  }, [normalizedCurrentTime, utterances]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentIndex >= 0 && segmentRefs.current[activeSegmentIndex] && scrollContainerRef.current) {
      const activeElement = segmentRefs.current[activeSegmentIndex];
      const container = scrollContainerRef.current;
      
      const elementTop = activeElement.offsetTop;
      const elementHeight = activeElement.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      if (elementTop < containerScrollTop || elementTop + elementHeight > containerScrollTop + containerHeight) {
        activeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [activeSegmentIndex]);

  const handleSegmentClick = (utterance: any) => {
    const seekTime = normalizeTimeToSeconds(utterance.start);
    onSeek(seekTime);
  };

  if (!utterances.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay transcripción con identificación de hablantes disponible
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayPause}
            className="flex items-center gap-2"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pausar' : 'Reproducir'}
          </Button>
          <SpeakerLegend 
            utterances={utterances} 
            transcriptionId={transcriptionResult?.transcript_id}
          />
        </div>
      </div>

      {/* Transcription segments */}
      <div 
        ref={scrollContainerRef}
        className="space-y-3 max-h-96 overflow-y-auto pr-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--border)) transparent'
        }}
      >
        {utterances.map((utterance, index) => (
          <SpeakerSegment
            key={`utterance-${index}-${utterance.start}`}
            utterance={utterance}
            isActive={index === activeSegmentIndex}
            onClick={() => handleSegmentClick(utterance)}
            refProp={{ current: segmentRefs.current[index] }}
            transcriptionId={transcriptionResult?.transcript_id}
          />
        ))}
      </div>
    </div>
  );
};

export default InteractiveTranscription;
