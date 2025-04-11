import { useRef } from "react";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { TranscriptionResult, SentenceTimestamp } from "@/services/audio/transcriptionService";

export const useRadioSegmentGenerator = (
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
) => {
  const segmentsGeneratedRef = useRef(false);
  const transcriptionLength = useRef(0);

  const generateRadioSegments = (transcriptionResult: TranscriptionResult | string) => {
    // Return early if no result, no callback, or text too short
    if (!transcriptionResult || !onSegmentsReceived) return;
    
    const text = typeof transcriptionResult === 'string' ? transcriptionResult : transcriptionResult.text;
    
    // If text is too short, don't process
    if (!text || text.length < 100) return;
    
    console.log("Starting segment generation process");
    
    // If we have a TranscriptionResult object with timestamps, use that
    if (typeof transcriptionResult !== 'string') {
      // APPROACH 1: Use sentence-level timestamps if available
      if (transcriptionResult.sentences && transcriptionResult.sentences.length >= 2) {
        console.log(`Using ${transcriptionResult.sentences.length} sentences with timestamps`);
        createSegmentsFromSentences(transcriptionResult.sentences, text, transcriptionResult.audio_duration);
        return;
      }
      
      // APPROACH 2: Use word-level timestamps if available to create clustered segments
      if (transcriptionResult.words && transcriptionResult.words.length > 0) {
        console.log(`Using ${transcriptionResult.words.length} words with timestamps to create segments`);
        createSegmentsFromWords(transcriptionResult.words, text, transcriptionResult.audio_duration);
        return;
      }
      
      // APPROACH 3: Use Whisper segments if available
      if (transcriptionResult.segments && transcriptionResult.segments.length >= 2) {
        console.log(`Using ${transcriptionResult.segments?.length} Whisper segments`);
        createSegmentsFromWhisperSegments(transcriptionResult.segments, text, transcriptionResult.audio_duration);
        return;
      }
    }
    
    // Fallback to text-based segmentation approaches

    // APPROACH 4: Try natural sentence splitting
    const naturalSegments = text.split(/(?:\.\s+)(?=[A-Z])/g)
      .filter(seg => seg.trim().length > 100);
      
    if (naturalSegments.length >= 2) {
      console.log(`Found ${naturalSegments.length} natural segments`);
      createSegmentsFromTextChunks(naturalSegments);
      return;
    }
    
    // APPROACH 5: Try paragraph splitting
    const paragraphs = text.split(/\n\s*\n/)
      .filter(p => p.trim().length > 50);
      
    if (paragraphs.length >= 2) {
      console.log(`Found ${paragraphs.length} paragraph segments`);
      createSegmentsFromTextChunks(paragraphs);
      return;
    }
    
    // APPROACH 6: Last resort - create evenly sized segments
    const textLength = text.length;
    const targetSegmentCount = Math.max(2, Math.min(5, Math.floor(textLength / 400)));
    console.log(`Using length-based segmentation with ${targetSegmentCount} segments`);
    
    const segments: RadioNewsSegment[] = [];
    const segmentSize = Math.floor(textLength / targetSegmentCount);
    
    for (let i = 0; i < targetSegmentCount; i++) {
      const start = i * segmentSize;
      let end = (i === targetSegmentCount - 1) ? textLength : (i + 1) * segmentSize;
      
      const searchText = text.substring(start, Math.min(end + 100, textLength));
      const sentenceMatch = searchText.match(/[.!?]\s+/);
      
      if (sentenceMatch && sentenceMatch.index && sentenceMatch.index > 50) {
        end = start + sentenceMatch.index + sentenceMatch[0].length;
      }
      
      const segmentText = text.substring(start, end).trim();
      if (segmentText.length > 0) {
        const headline = extractHeadline(segmentText);
        
        segments.push({
          headline: headline || `Segmento ${i + 1}`,
          text: segmentText,
          start: i * 60000,
          end: (i + 1) * 60000,
          keywords: extractKeywords(segmentText)
        });
      }
    }
    
    if (segments.length > 0) {
      onSegmentsReceived(segments);
    }
  };
  
  // Create segments from AssemblyAI sentences with timestamps
  const createSegmentsFromSentences = (
    sentences: SentenceTimestamp[], 
    fullText: string,
    audioDuration?: number
  ) => {
    if (!onSegmentsReceived) return;
    
    // Group sentences into target segments (ideally 3-6 segments)
    const totalSentences = sentences.length;
    const targetSegmentCount = Math.min(6, Math.max(3, Math.floor(totalSentences / 8)));
    const sentencesPerSegment = Math.ceil(totalSentences / targetSegmentCount);
    
    const segments: RadioNewsSegment[] = [];
    
    for (let i = 0; i < targetSegmentCount; i++) {
      const startIndex = i * sentencesPerSegment;
      const endIndex = Math.min((i + 1) * sentencesPerSegment, totalSentences);
      
      if (startIndex >= totalSentences) break;
      
      const segmentSentences = sentences.slice(startIndex, endIndex);
      
      if (segmentSentences.length === 0) continue;
      
      const segmentText = segmentSentences.map(s => s.text).join(' ');
      const startTime = segmentSentences[0].start;
      const endTime = segmentSentences[segmentSentences.length - 1].end;
      const headline = extractHeadline(segmentText);
      
      segments.push({
        headline: headline || `Segmento ${i + 1}`,
        text: segmentText,
        start: startTime,
        end: endTime,
        keywords: extractKeywords(segmentText)
      });
    }
    
    if (segments.length > 0) {
      onSegmentsReceived(segments);
      return true;
    }
    
    return false;
  };
  
  // Create segments from word-level timestamps
  const createSegmentsFromWords = (
    words: any[], 
    fullText: string,
    audioDuration?: number
  ) => {
    if (!onSegmentsReceived || words.length < 10) return false;
    
    const totalDuration = audioDuration || (words[words.length - 1]?.end || 0);
    
    // Target 4-6 segments of roughly equal duration
    const targetSegmentCount = Math.min(6, Math.max(3, Math.ceil(totalDuration / 60000)));
    const targetDurationPerSegment = totalDuration / targetSegmentCount;
    
    const segments: RadioNewsSegment[] = [];
    let currentSegmentWords: any[] = [];
    let segmentStartTime = words[0].start;
    let segmentIndex = 0;
    
    // Group words into segments based on duration
    for (let i = 0; i < words.length; i++) {
      currentSegmentWords.push(words[i]);
      
      // Check if we've reached the target duration or end of words
      const currentWordEnd = words[i].end;
      const segmentDuration = currentWordEnd - segmentStartTime;
      
      // Create a segment if we've reached target duration or at a sentence boundary
      const isEndOfSentence = words[i].text.match(/[.!?]$/);
      const isLongEnough = segmentDuration >= targetDurationPerSegment * 0.8;
      
      if ((isEndOfSentence && isLongEnough) || segmentDuration >= targetDurationPerSegment || i === words.length - 1) {
        if (currentSegmentWords.length > 5) {
          const segmentText = currentSegmentWords.map(w => w.text).join(' ');
          const headline = extractHeadline(segmentText);
          
          segments.push({
            headline: headline || `Segmento ${segmentIndex + 1}`,
            text: segmentText,
            start: segmentStartTime,
            end: currentWordEnd,
            keywords: extractKeywords(segmentText)
          });
          
          segmentIndex++;
          segmentStartTime = i < words.length - 1 ? words[i + 1].start : currentWordEnd;
          currentSegmentWords = [];
        }
      }
    }
    
    // If we didn't create any segments, fallback
    if (segments.length === 0) {
      return false;
    }
    
    // If we have too few segments, try to split the longest ones
    if (segments.length < 3 && fullText.length > 1000) {
      // Implementation for splitting long segments could go here
      // For now we'll use what we have
    }
    
    if (segments.length > 0) {
      onSegmentsReceived(segments);
      return true;
    }
    
    return false;
  };
  
  // Create segments from Whisper segments
  const createSegmentsFromWhisperSegments = (
    whisperSegments: any[],
    fullText: string,
    audioDuration?: number
  ) => {
    if (!onSegmentsReceived) return false;
    
    // Group Whisper segments to get 3-6 final segments
    const totalSegments = whisperSegments.length;
    const targetSegmentCount = Math.min(6, Math.max(3, Math.ceil(totalSegments / 8)));
    const whisperSegmentsPerSegment = Math.ceil(totalSegments / targetSegmentCount);
    
    const segments: RadioNewsSegment[] = [];
    
    for (let i = 0; i < targetSegmentCount; i++) {
      const startIndex = i * whisperSegmentsPerSegment;
      const endIndex = Math.min((i + 1) * whisperSegmentsPerSegment, totalSegments);
      
      if (startIndex >= totalSegments) break;
      
      const currentWhisperSegments = whisperSegments.slice(startIndex, endIndex);
      
      if (currentWhisperSegments.length === 0) continue;
      
      const segmentText = currentWhisperSegments.map(s => s.text).join(' ');
      // Convert seconds to milliseconds for consistency
      const startTime = Math.round(currentWhisperSegments[0].start * 1000);
      const endTime = Math.round(currentWhisperSegments[currentWhisperSegments.length - 1].end * 1000);
      const headline = extractHeadline(segmentText);
      
      segments.push({
        headline: headline || `Segmento ${i + 1}`,
        text: segmentText,
        start: startTime,
        end: endTime,
        keywords: extractKeywords(segmentText)
      });
    }
    
    if (segments.length > 0) {
      onSegmentsReceived(segments);
      return true;
    }
    
    return false;
  };
  
  // Process text chunks (for text-only segmentation without timestamps)
  const createSegmentsFromTextChunks = (chunks: string[]) => {
    if (!onSegmentsReceived) return;
    
    const segments: RadioNewsSegment[] = chunks.map((chunk, index) => {
      const headline = extractHeadline(chunk);
      return {
        headline: headline || `Segmento ${index + 1}`,
        text: chunk,
        start: index * 60000,
        end: (index + 1) * 60000,
        keywords: extractKeywords(chunk)
      };
    });
    
    onSegmentsReceived(segments);
  };
  
  const extractHeadline = (text: string): string => {
    const firstSentence = text.split(/[.!?]/, 1)[0];
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  };
  
  const extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\wáéíóúüñ\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
      
    const wordFrequency: Record<string, number> = {};
    const stopWords = ['para', 'como', 'pero', 'cuando', 'donde', 'porque', 'entonces', 'también', 'esto', 'esta', 'estos', 'estas'];
    
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };
  
  const checkAndGenerateSegments = (transcriptionResult: TranscriptionResult | string) => {
    const text = typeof transcriptionResult === 'string' ? transcriptionResult : transcriptionResult.text;
    const currentLength = text?.length || 0;
    const lengthChanged = Math.abs(currentLength - transcriptionLength.current) > 100;
    
    if (text && 
        currentLength > 100 && 
        onSegmentsReceived && 
        (!segmentsGeneratedRef.current || lengthChanged)) {
      
      console.log("Generating segments from transcription:", currentLength, 
                "Previous length:", transcriptionLength.current,
                "Already generated:", segmentsGeneratedRef.current);
      
      generateRadioSegments(transcriptionResult);
      segmentsGeneratedRef.current = true;
      transcriptionLength.current = currentLength;
      return true;
    }
    
    return false;
  };

  return {
    checkAndGenerateSegments,
    generateRadioSegments
  };
};
