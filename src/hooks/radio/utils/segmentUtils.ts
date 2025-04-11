
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { SentenceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Extract a headline from text segment
 */
export const extractHeadline = (text: string): string => {
  const firstSentence = text.split(/[.!?]/, 1)[0];
  return firstSentence.length > 50 
    ? firstSentence.substring(0, 47) + '...'
    : firstSentence;
};

/**
 * Extract keywords from text segment
 */
export const extractKeywords = (text: string): string[] => {
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
