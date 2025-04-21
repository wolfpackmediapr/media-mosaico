import { useState, useMemo, useEffect } from "react";
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
  // Determine available view modes
  const viewModes = {
    speaker: Boolean(transcriptionResult?.utterances?.length),
    sentence: Boolean(transcriptionResult?.sentences?.length),
    word: Boolean(transcriptionResult?.words?.length)
  };
  const modeList: ViewMode[] = (["speaker", "sentence", "word"] as ViewMode[]).filter(
    mode => viewModes[mode]
  );

  // Set initial viewMode based on available data
  const defaultViewMode = modeList.length > 0 ? modeList[0] : "word";

  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  // Keep current mode if still available, else fallback to first available
  useEffect(() => {
    if (!viewModes[viewMode]) {
      setViewMode(defaultViewMode);
    }
    // Reset to speaker if utterances just loaded and they weren't before
    if (transcriptionResult?.utterances?.length && viewMode !== "speaker") {
      setViewMode("speaker");
    }
    // eslint-disable-next-line
  }, [transcriptionResult, defaultViewMode]);

  // Generate timestamped items based on current view mode
  const timestampedItems = useMemo(() => {
    if (!transcriptionResult) return [];
    if (viewMode === 'speaker' && transcriptionResult.utterances?.length) {
      return transcriptionResult.utterances.map(utterance => ({
        text: utterance.text,
        start: utterance.start,
        end: utterance.end,
        type: "speaker" as const,
        speaker: utterance.speaker
      }));
    }
    if (viewMode === 'sentence' && transcriptionResult.sentences?.length) {
      return transcriptionResult.sentences.map(sentence => ({
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
        type: "sentence" as const
      }));
    }
    if (transcriptionResult.words?.length) {
      return transcriptionResult.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end,
        type: "word" as const
      }));
    }
    return [];
  }, [transcriptionResult, viewMode]);

  const canToggleViewMode = modeList.length > 1;
  const toggleViewMode = () => {
    if (!canToggleViewMode) return;
    const idx = modeList.indexOf(viewMode);
    setViewMode(modeList[(idx + 1) % modeList.length]);
  };

  // Spanish helper labels
  const getViewModeName = () => {
    switch (viewMode) {
      case 'speaker': return "Vista por Hablantes";
      case 'sentence': return "Vista por Oraciones";
      case 'word': return "Vista por Palabras";
    }
  };
  const getNextViewModeName = () => {
    const idx = modeList.indexOf(viewMode);
    const next = modeList[(idx + 1) % modeList.length];
    switch(next) {
      case 'speaker': return "Cambiar a Hablantes";
      case 'sentence': return "Cambiar a Oraciones";
      case 'word': return "Cambiar a Palabras";
    }
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
