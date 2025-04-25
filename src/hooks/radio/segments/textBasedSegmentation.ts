
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { extractHeadline, extractKeywords } from "../utils/segmentUtils";

/**
 * Create segments from natural sentence splitting
 */
export const createSegmentsFromTextChunks = (
  chunks: string[],
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
): boolean => {
  if (!onSegmentsReceived) return false;
  
  const segments: RadioNewsSegment[] = chunks.map((chunk, index) => {
    const headline = extractHeadline(chunk);
    return {
      headline: headline || `Segmento ${index + 1}`,
      text: chunk,
      startTime: index * 60000, // use milliseconds consistently
      end: (index + 1) * 60000, // use milliseconds consistently
      keywords: extractKeywords(chunk)
    };
  });
  
  // Log timestamps for debugging
  console.log("Generated segments from text chunks with estimated timestamps:", segments.map(s => ({
    headline: s.headline,
    startTime: s.startTime,
    end: s.end
  })));
  
  onSegmentsReceived(segments);
  return true;
};

/**
 * Create evenly sized segments based on text length
 */
export const createLengthBasedSegments = (
  text: string,
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
): boolean => {
  if (!text || !onSegmentsReceived) return false;
  
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
        startTime: i * 60000,
        end: (i + 1) * 60000,
        keywords: extractKeywords(segmentText)
      });
    }
  }
  
  if (segments.length > 0) {
    console.log("Generated segments with timestamps:", segments.map(s => ({
      headline: s.headline,
      startTime: s.startTime,
      end: s.end
    })));
    
    onSegmentsReceived(segments);
    return true;
  }
  
  return false;
};
