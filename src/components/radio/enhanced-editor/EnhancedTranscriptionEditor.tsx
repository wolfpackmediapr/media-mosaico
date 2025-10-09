import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormattingToolbar } from './FormattingToolbar';
import { SpeakerSegment } from './SpeakerSegment';
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatSpeakerText } from "../utils/speakerTextUtils";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface EnhancedTranscriptionEditorProps {
  transcriptionResult?: TranscriptionResult;
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  onTimestampClick?: (timestamp: number) => void;
  currentTime?: number;
  transcriptionId?: string;
}

export const EnhancedTranscriptionEditor: React.FC<EnhancedTranscriptionEditorProps> = ({
  transcriptionResult,
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  onTimestampClick,
  currentTime = 0,
  transcriptionId
}) => {
  // Initialize all state hooks at the top level
  const [utterances, setUtterances] = useState<UtteranceTimestamp[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableText, setEditableText] = useState('');

  // Memoize utterances to prevent unnecessary re-renders
  const hasUtterances = useMemo(() => 
    transcriptionResult?.utterances && 
    transcriptionResult.utterances.length > 0, 
  [transcriptionResult?.utterances]);

  // Process utterances when transcription result changes
  useEffect(() => {
    if (hasUtterances) {
      setUtterances(transcriptionResult!.utterances!);
      
      // Format the text with speaker labels if not already formatted
      const formattedText = formatSpeakerText(transcriptionResult!.utterances!);
      if (formattedText && (!transcriptionText || transcriptionText !== formattedText)) {
        onTranscriptionChange(formattedText);
      }
    } else if (transcriptionText && !transcriptionText.includes('SPEAKER ')) {
      // If text doesn't have SPEAKER format, it's likely analysis content - show warning
      console.warn('[EnhancedTranscriptionEditor] Transcription text does not contain SPEAKER format');
      setEditableText('Transcripción no disponible - el contenido no pudo ser procesado correctamente');
    }
  }, [hasUtterances, onTranscriptionChange, transcriptionResult, transcriptionText]);

  // Initialize editable text when transcription text changes
  useEffect(() => {
    if (transcriptionText) {
      setEditableText(transcriptionText);
    }
  }, [transcriptionText]);

  // Track active segment based on current playback time
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditableText(newText);
    onTranscriptionChange(newText);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // When exiting edit mode, ensure all changes are saved
      onTranscriptionChange(editableText);
    }
  };

  const handleTimestampClick = (timestamp: number) => {
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };

  // Render appropriate content based on state
  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="flex items-center justify-center p-6 h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <p className="text-muted-foreground">Procesando transcripción...</p>
        </div>
      );
    }

    if (isEditMode || (!utterances.length && transcriptionText)) {
      return (
        <Textarea
          value={editableText}
          onChange={handleTextChange}
          placeholder="Aquí aparecerá el texto transcrito..."
          className="min-h-[300px] resize-y"
        />
      );
    }

    if (utterances.length > 0) {
      return (
        <ScrollArea className="h-[400px]">
          {utterances.map((utterance, index) => (
            <SpeakerSegment
              key={`${utterance.speaker}-${utterance.start}-${index}`}
              speaker={utterance.speaker}
              text={utterance.text}
              timestamp={utterance.start}
              isActive={index === activeSegmentIndex}
              onTimestampClick={() => handleTimestampClick(utterance.start)}
              transcriptionId={transcriptionId}
            />
          ))}
        </ScrollArea>
      );
    }

    return (
      <div className="text-center text-muted-foreground p-6 min-h-[300px] flex items-center justify-center">
        {transcriptionText ? (
          <Textarea
            value={transcriptionText}
            onChange={handleTextChange}
            placeholder="Aquí aparecerá el texto transcrito..."
            className="min-h-[300px] resize-y"
          />
        ) : (
          "No hay transcripción disponible"
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <FormattingToolbar
        onFormatText={handleFormatText}
        onExport={handleExport}
        onAlignText={handleAlignText}
        onToggleEditMode={toggleEditMode}
        isEditMode={isEditMode}
      />
      <CardContent className="p-4">
        {renderContent()}
      </CardContent>
    </Card>
  );
};
