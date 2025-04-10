import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface RadioSegmentGeneratorOptions {
  transcriptionText: string;
  onSegmentsGenerated: (segments: RadioNewsSegment[]) => void;
}

class RadioSegmentGenerator {
  transcriptionText: string;
  onSegmentsGenerated: (segments: RadioNewsSegment[]) => void;
  
  constructor(options: RadioSegmentGeneratorOptions) {
    this.transcriptionText = options.transcriptionText;
    this.onSegmentsGenerated = options.onSegmentsGenerated;
  }
  
  generateRadioSegments = (text: string) => {
    if (!text || text.length < 100 || !this.onSegmentsGenerated) return;
    
    console.log("Starting segment generation process");
    
    // Look for natural breakpoints like periods followed by new sentences
    const naturalSegments = text.split(/(?:\.\s+)(?=[A-Z])/g)
      .filter(seg => seg.trim().length > 100);
      
    // If natural segmentation gives us good chunks, use them
    if (naturalSegments.length >= 2) {
      console.log(`Found ${naturalSegments.length} natural segments`);
      this.createSegmentsFromChunks(naturalSegments);
      return;
    }
    
    // Otherwise try paragraph-based segmentation
    const paragraphs = text.split(/\n\s*\n/)
      .filter(p => p.trim().length > 50);
      
    if (paragraphs.length >= 2) {
      console.log(`Found ${paragraphs.length} paragraph segments`);
      this.createSegmentsFromChunks(paragraphs);
      return;
    }
    
    // If still no good chunks, use time-based segmentation
    // Divide into roughly equal segments based on text length
    const textLength = text.length;
    const targetSegmentCount = Math.max(2, Math.min(5, Math.floor(textLength / 400)));
    console.log(`Using time-based segmentation with ${targetSegmentCount} segments`);
    
    const segments: RadioNewsSegment[] = [];
    const segmentSize = Math.floor(textLength / targetSegmentCount);
    
    for (let i = 0; i < targetSegmentCount; i++) {
      const start = i * segmentSize;
      let end = (i === targetSegmentCount - 1) ? textLength : (i + 1) * segmentSize;
      
      // Try to find a sentence break near the calculated end point
      const searchText = text.substring(start, Math.min(end + 100, textLength));
      const sentenceMatch = searchText.match(/[.!?]\s+/);
      
      if (sentenceMatch && sentenceMatch.index && sentenceMatch.index > 50) {
        end = start + sentenceMatch.index + sentenceMatch[0].length;
      }
      
      const segmentText = text.substring(start, end).trim();
      if (segmentText.length > 0) {
        const headline = this.extractHeadline(segmentText);
        
        segments.push({
          headline: headline || `Segmento ${i + 1}`,
          text: segmentText,
          start: i * 60000, // Spread timestamps evenly (60s per segment)
          end: (i + 1) * 60000,
          keywords: this.extractKeywords(segmentText)
        });
      }
    }
    
    if (segments.length > 0) {
      this.onSegmentsGenerated(segments);
    }
  };
  
  createSegmentsFromChunks = (chunks: string[]) => {
    if (!this.onSegmentsGenerated) return;
    
    const segments: RadioNewsSegment[] = chunks.map((chunk, index) => {
      const headline = this.extractHeadline(chunk);
      return {
        headline: headline || `Segmento ${index + 1}`,
        text: chunk,
        start: index * 60000,
        end: (index + 1) * 60000,
        keywords: this.extractKeywords(chunk)
      };
    });
    
    this.onSegmentsGenerated(segments);
  };
  
  extractHeadline = (text: string): string => {
    // Find the first sentence or part to use as headline
    const firstSentence = text.split(/[.!?]/, 1)[0];
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  };
  
  extractKeywords = (text: string): string[] => {
    // Simple keyword extraction based on word frequency
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
}

export default RadioSegmentGenerator;
