
import { useState, useMemo } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

export type ViewMode = 'speaker' | 'sentence' | 'word';

export interface TimestampedItem {
  text: string;
  start: number;
  end: number;
  type: 'sentence' | 'word' | 'speaker';
  speaker?: string;
}

interface ViewModeManagerProps {
  transcriptionResult?: TranscriptionResult;
  onTimestampClick?: (timestamp: number) => void;
}

export const useViewModeManager = ({ transcriptionResult }: ViewModeManagerProps) => {
  // Initialize viewMode based on available data
  const initialViewMode = useMemo(() => {
    if (transcriptionResult?.utterances?.length) return 'speaker';
    if (transcriptionResult?.sentences?.length) return 'sentence';
    return 'word';
  }, [transcriptionResult]);

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  
  // Generate timestamped items based on available data
  const timestampedItems = useMemo(() => {
    if (!transcriptionResult) return [] as TimestampedItem[];
    
    // If we have speaker utterances and we're in speaker mode, use them (top priority)
    if (viewMode === 'speaker' && transcriptionResult.utterances && transcriptionResult.utterances.length > 0) {
      return transcriptionResult.utterances.map(utterance => ({
        text: utterance.text,
        start: utterance.start,
        end: utterance.end,
        type: 'speaker' as const,
        speaker: utterance.speaker
      }));
    }
    
    // If we have sentences with timestamps and we're in sentence mode, use them
    if (viewMode === 'sentence' && transcriptionResult.sentences && transcriptionResult.sentences.length > 0) {
      return transcriptionResult.sentences.map(sentence => ({
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
        type: 'sentence' as const
      }));
    }
    
    // Fall back to word-level timestamps
    if (transcriptionResult.words && transcriptionResult.words.length > 0) {
      return transcriptionResult.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end,
        type: 'word' as const
      }));
    }
    
    return [] as TimestampedItem[];
  }, [transcriptionResult, viewMode]);

  // Update view mode when transcription result changes (e.g., when utterances are fetched)
  useMemo(() => {
    if (viewMode === 'speaker' && transcriptionResult?.utterances?.length) {
      // If we're already in speaker mode and utterances are loaded, stay there
      return;
    }
    
    if (transcriptionResult?.utterances?.length && initialViewMode === 'speaker') {
      setViewMode('speaker');
    } else if (transcriptionResult?.sentences?.length && !transcriptionResult.utterances?.length) {
      setViewMode('sentence');
    } else if (transcriptionResult?.words?.length && 
               !transcriptionResult.utterances?.length && 
               !transcriptionResult.sentences?.length) {
      setViewMode('word');
    }
  }, [transcriptionResult, initialViewMode]);

  // Determine available view modes
  const viewModes = {
    speaker: Boolean(transcriptionResult?.utterances?.length),
    sentence: Boolean(transcriptionResult?.sentences?.length),
    word: Boolean(transcriptionResult?.words?.length)
  };
  
  const canToggleViewMode = Object.values(viewModes).filter(Boolean).length > 1;

  const toggleViewMode = () => {
    if (viewMode === 'speaker' && transcriptionResult?.sentences?.length) {
      setViewMode('sentence');
    } else if (viewMode === 'sentence' && transcriptionResult?.words?.length) {
      setViewMode('word');
    } else {
      // If we have speaker data, cycle back to it, otherwise go to the first available mode
      if (transcriptionResult?.utterances?.length) {
        setViewMode('speaker');
      } else if (transcriptionResult?.sentences?.length) {
        setViewMode('sentence');
      } else if (transcriptionResult?.words?.length) {
        setViewMode('word');
      }
    }
  };

  // Helper to get the current view mode name in Spanish
  const getViewModeName = () => {
    switch (viewMode) {
      case 'speaker': return 'Vista por Hablantes';
      case 'sentence': return 'Vista por Oraciones';
      case 'word': return 'Vista por Palabras';
    }
  };
  
  // Get the next view mode for the toggle button
  const getNextViewModeName = () => {
    if (viewMode === 'speaker') return 'Cambiar a Oraciones';
    if (viewMode === 'sentence') return 'Cambiar a Palabras';
    return 'Cambiar a Hablantes';
  };

  return {
    viewMode,
    timestampedItems,
    canToggleViewMode,
    toggleViewMode,
    getViewModeName,
    getNextViewModeName,
    viewModes
  };
};
