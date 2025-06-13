import { useState, useCallback } from "react";
import { NewsSegment } from "./useTvVideoProcessor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

export const useTvSegmentGenerator = (onSegmentsGenerated?: (segments: NewsSegment[]) => void) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTvSegments = useCallback(async (input: string | TranscriptionResult) => {
    if (!onSegmentsGenerated) return;
    
    setIsGenerating(true);
    
    try {
      // For TV, we can generate basic segments from text
      // This could be enhanced later with more sophisticated processing
      let segments: NewsSegment[] = [];
      
      if (typeof input === 'string') {
        // Simple text-based segmentation for TV
        const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 20);
        segments = sentences.map((sentence, index) => ({
          headline: `Segmento TV ${index + 1}`,
          text: sentence.trim(),
          start: index * 30, // Approximate timing
          end: (index + 1) * 30,
          keywords: []
        })).slice(0, 10); // Limit to 10 segments
      } else {
        // Handle TranscriptionResult with utterances
        const utterances = input.utterances || [];
        segments = utterances.map((utterance, index) => ({
          headline: `Segmento TV ${index + 1}`,
          text: utterance.text,
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          keywords: []
        })).slice(0, 10);
      }
      
      onSegmentsGenerated(segments);
    } catch (error) {
      console.error('[TvSegmentGenerator] Error generating segments:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [onSegmentsGenerated]);

  return {
    generateTvSegments,
    isGenerating
  };
};