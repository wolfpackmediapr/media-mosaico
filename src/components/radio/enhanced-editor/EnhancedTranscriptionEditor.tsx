
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormattingToolbar } from './FormattingToolbar';
import { SpeakerSegment } from './SpeakerSegment';
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatSpeakerText } from "../utils/speakerTextUtils";

interface EnhancedTranscriptionEditorProps {
  transcriptionResult?: TranscriptionResult;
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  onTimestampClick?: (timestamp: number) => void;
  currentTime?: number;
}

export const EnhancedTranscriptionEditor = ({
  transcriptionResult,
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  onTimestampClick,
  currentTime = 0
}: EnhancedTranscriptionEditorProps) => {
  const [utterances, setUtterances] = useState<UtteranceTimestamp[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);

  useEffect(() => {
    if (transcriptionResult?.utterances) {
      setUtterances(transcriptionResult.utterances);
      const formattedText = formatSpeakerText(transcriptionResult.utterances);
      if (formattedText !== transcriptionText) {
        onTranscriptionChange(formattedText);
      }
    }
  }, [transcriptionResult?.utterances, onTranscriptionChange, transcriptionText]);

  useEffect(() => {
    if (currentTime && utterances.length > 0) {
      const activeIndex = utterances.findIndex(
        (u) => currentTime >= u.start / 1000 && currentTime <= u.end / 1000
      );
      setActiveSegmentIndex(activeIndex);
    }
  }, [currentTime, utterances]);

  const handleFormatText = (format: string) => {
    // Will be implemented in a future update with rich text editing
    console.log('Format:', format);
  };

  const handleAlignText = (alignment: string) => {
    // Will be implemented in a future update with rich text editing
    console.log('Alignment:', alignment);
  };

  const handleExport = (format: 'txt' | 'srt') => {
    const content = format === 'srt' ? 
      generateSRT(utterances) : 
      transcriptionText;
      
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSRT = (utterances: UtteranceTimestamp[]): string => {
    return utterances.map((u, i) => {
      const start = new Date(u.start).toISOString().substr(11, 12).replace('.', ',');
      const end = new Date(u.end).toISOString().substr(11, 12).replace('.', ',');
      return `${i + 1}\n${start} --> ${end}\n${u.text}\n\n`;
    }).join('');
  };

  return (
    <Card className="w-full">
      <FormattingToolbar
        onFormatText={handleFormatText}
        onExport={handleExport}
        onAlignText={handleAlignText}
      />
      <CardContent className="p-4">
        <ScrollArea className="h-[400px]">
          {utterances.length > 0 ? (
            utterances.map((utterance, index) => (
              <SpeakerSegment
                key={`${utterance.speaker}-${utterance.start}`}
                speaker={utterance.speaker}
                text={utterance.text}
                timestamp={utterance.start}
                isActive={index === activeSegmentIndex}
                onTimestampClick={() => onTimestampClick?.(utterance.start)}
              />
            ))
          ) : (
            <div className="text-center text-muted-foreground p-4">
              {isProcessing ? (
                "Procesando transcripción..."
              ) : (
                transcriptionText || "No hay transcripción disponible"
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
