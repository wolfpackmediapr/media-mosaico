
import { useEffect, useRef } from 'react';

interface ClearRadioStateOptions {
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
}

export const useClearRadioState = ({
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
}: ClearRadioStateOptions = {}) => {
  const clearAnalysisRef = useRef<(() => void) | null>(null);
  const editorResetRef = useRef<null | (() => void)>(null);

  const handleEditorRegisterReset = (resetFn: () => void) => {
    editorResetRef.current = resetFn;
  };

  const setClearAnalysis = (fn: () => void) => {
    clearAnalysisRef.current = fn;
  };

  const clearAllState = () => {
    console.log('[useClearRadioState] Clearing all state');
    
    const keysToDelete = [
      `${persistKey}-metadata`,
      `${persistKey}-current-index`,
      "radio-transcription",
      "radio-transcription-draft",
      "radio-content-analysis-draft",
      "radio-content-analysis",
      "radio-transcription-speaker-draft",
      "transcription-timestamp-view-draft",
      "transcription-editor-mode-draft",
      `${persistKey}-text-content`,
      "radio-transcription-text-content"
    ];

    if (transcriptionId) {
      keysToDelete.push(
        `radio-transcription-${transcriptionId}`,
        `radio-transcription-speaker-${transcriptionId}`,
        `transcription-timestamp-view-${transcriptionId}`,
        `transcription-editor-mode-${transcriptionId}`,
        `radio-content-analysis-${transcriptionId}`,
        `radio-transcription-text-content-${transcriptionId}`
      );
    }

    keysToDelete.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`[useClearRadioState] Cleared storage key: ${key}`);
    });

    const allKeys = Object.keys(sessionStorage);
    const patternPrefixes = [
      'radio-transcription',
      'transcription-editor',
      'transcription-timestamp',
      'radio-content-analysis',
      'radio-transcription-text'
    ];

    allKeys.forEach(key => {
      if (patternPrefixes.some(prefix => key.startsWith(prefix))) {
        console.log(`[useClearRadioState] Clearing additional key: ${key}`);
        sessionStorage.removeItem(key);
      }
    });

    if (clearAnalysisRef.current) {
      console.log('[useClearRadioState] Clearing analysis state');
      clearAnalysisRef.current();
    }

    if (editorResetRef.current) {
      console.log('[useClearRadioState] Calling editor reset function');
      editorResetRef.current();
    } else {
      console.log('[useClearRadioState] No editor reset function registered');
    }

    if (onTextChange) {
      onTextChange("");
    }

    console.log('[useClearRadioState] All state cleared');
  };

  return {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis
  };
};
