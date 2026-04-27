import { useEffect, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import {
  parseTvSpeakerText,
  hasTvSpeakerPatterns,
} from "@/utils/tv/speakerTextParser";

interface Props {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

/**
 * TV-only speaker text state.
 *
 * Unlike the radio version (`useSpeakerTextState`), this hook does NOT
 * re-format parsed utterances back into "SPEAKER X: …" text. The TV backend
 * already emits the canonical wire format:
 *
 *   [00:00] SPEAKER A (Name - Role): dialogue
 *
 * Re-formatting from parsed utterances (whose speaker IDs use the TV
 * "A|Name|Role" convention) caused the doubled prefix bug:
 *
 *   SPEAKER A: SPEAKER A|Name|Role: dialogue
 *
 * Here we just persist the backend text as-is and parse utterances for the
 * interactive view, never writing a regenerated version back into the editor.
 */
export const useTvSpeakerTextState = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: Props) => {
  const mountedRef = useRef(true);
  const persistKey = `radio-transcription-speaker-${transcriptionId || "draft"}`;

  const [isEditing, setIsEditing, removeEditorMode] = usePersistentState(
    `transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: "sessionStorage" },
  );

  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);

  const [localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText] =
    usePersistentState(persistKey, "", { storage: "sessionStorage" });

  const lastTextRef = useRef(transcriptionText);

  const hasSpeakerLabels = Boolean(
    (enhancedTranscriptionResult?.utterances?.length || 0) > 0 ||
      hasTvSpeakerPatterns(localSpeakerText || transcriptionText),
  );

  // Clear local cache when transcription text is cleared upstream
  useEffect(() => {
    if (!transcriptionText && localSpeakerText) {
      removeLocalSpeakerText();
      setLocalSpeakerText("");
      lastTextRef.current = "";
    }
  }, [transcriptionText, localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText]);

  // Mirror backend text into local editor state and rebuild parsed utterances
  // for the interactive view — but never rewrite the text itself.
  useEffect(() => {
    if (!mountedRef.current) return;
    if (!transcriptionText) return;
    if (transcriptionText === lastTextRef.current && localSpeakerText) return;

    lastTextRef.current = transcriptionText;
    if (transcriptionText !== localSpeakerText) {
      setLocalSpeakerText(transcriptionText);
    }

    // Parse utterances for the interactive view (does not change the text)
    if (hasTvSpeakerPatterns(transcriptionText)) {
      const utterances = parseTvSpeakerText(transcriptionText);
      if (utterances.length > 0) {
        setEnhancedTranscriptionResult((prev) => ({
          ...(prev || {}),
          text: transcriptionText,
          utterances,
        }) as TranscriptionResult);
      }
    }
  }, [transcriptionText, localSpeakerText, setLocalSpeakerText]);

  // If a richer result with utterances arrives, keep it for the interactive view
  useEffect(() => {
    if (
      transcriptionResult?.utterances &&
      transcriptionResult.utterances.length > 0
    ) {
      setEnhancedTranscriptionResult(transcriptionResult);
    }
  }, [transcriptionResult]);

  const handleTextChange = (newText: string) => {
    if (!mountedRef.current) return;
    lastTextRef.current = newText;
    setLocalSpeakerText(newText);
    onTranscriptionChange(newText);

    if (hasTvSpeakerPatterns(newText)) {
      const utterances = parseTvSpeakerText(newText);
      if (utterances.length > 0) {
        setEnhancedTranscriptionResult((prev) => ({
          ...(prev || {}),
          text: newText,
          utterances,
        }) as TranscriptionResult);
      }
    }

    if (!isEditing) setIsEditing(true);
  };

  const toggleEditMode = () => setIsEditing(!isEditing);

  const resetLocalSpeakerText = () => {
    if (!mountedRef.current) return;
    removeLocalSpeakerText();
    removeEditorMode();
    setLocalSpeakerText("");
    setIsEditing(false);
    lastTextRef.current = "";
    try {
      sessionStorage.removeItem(persistKey);
      sessionStorage.removeItem(
        `transcription-editor-mode-${transcriptionId || "draft"}`,
      );
    } catch {
      /* best effort */
    }
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    localText: localSpeakerText,
    isEditing,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult,
  };
};