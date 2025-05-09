
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";

// Cache for formatted speaker text to avoid redundant processing
const formattedTextCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10;

// Helper to batch process large arrays
function processBatched<T, R>(items: T[], batchSize: number, processor: (item: T) => R): R[] {
  const results: R[] = [];
  const totalItems = items.length;
  
  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map(processor);
    results.push(...batchResults);
  }
  
  return results;
}

// Helper to update the cache with LRU policy
function updateCache(key: string, value: string) {
  // If cache is full, remove the oldest entry
  if (formattedTextCache.size >= MAX_CACHE_SIZE) {
    const firstKey = formattedTextCache.keys().next().value;
    formattedTextCache.delete(firstKey);
  }
  formattedTextCache.set(key, value);
}

/**
 * Formats the speaker utterances into a single text block, i.e.
 * SPEAKER 1: <text>
 * SPEAKER 2: <text>
 * ...
 */
export function formatSpeakerText(utterances: UtteranceTimestamp[]): string {
  if (!utterances || utterances.length === 0) return "";
  
  // Generate a cache key based on utterances content
  const cacheKey = JSON.stringify(utterances.map(u => ({
    speaker: u.speaker,
    text: u.text.substring(0, 20), // Use only first 20 chars for cache key
    start: u.start,
    end: u.end
  })));
  
  // Check cache first
  if (formattedTextCache.has(cacheKey)) {
    return formattedTextCache.get(cacheKey)!;
  }
  
  // Process in batches to avoid long-running operations
  const BATCH_SIZE = 20;
  const formattedUtterances = processBatched(utterances, BATCH_SIZE, (u) => {
    // Extract numeric part if speaker comes as "speaker_1" format from AssemblyAI
    const speakerNum = typeof u.speaker === 'string' ? 
      u.speaker.includes('_') ? u.speaker.split('_')[1] : u.speaker 
      : u.speaker;
      
    return `SPEAKER ${speakerNum}: ${u.text}`.trim();
  });
  
  const result = formattedUtterances.join("\n\n");
  
  // Update cache
  updateCache(cacheKey, result);
  
  return result;
}

/**
 * Attempts to parse an edited speaker-annotated text back to utterances.
 * This only supports a simple format where each utterance starts with "SPEAKER X:"
 */
export function parseSpeakerTextToUtterances(text: string): UtteranceTimestamp[] {
  if (!text) return [];
  
  // Split text into chunks to process more efficiently
  const CHUNK_SIZE = 10000; // 10KB chunks
  const chunks = [];
  
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  
  // Process each chunk
  const utterances: UtteranceTimestamp[] = [];
  let utteranceIndex = 0;
  
  for (const chunk of chunks) {
    // Split chunk by double newlines to find paragraphs
    const paragraphs = chunk.split(/\n\s*\n/);
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      // Match the format SPEAKER X: text
      const prefixMatch = paragraph.match(/^SPEAKER (\d+|[A-Z]):\s*/);
      if (prefixMatch) {
        const speaker = prefixMatch[1];
        const textOnly = paragraph.replace(/^SPEAKER (\d+|[A-Z]):\s*/, "");
        
        // For reconstructed utterances, we add dummy timestamps based on index
        // This helps with display ordering while still making them editable
        utterances.push({
          speaker,
          text: textOnly,
          start: utteranceIndex * 5000, // 5 seconds per segment as placeholder
          end: (utteranceIndex + 1) * 5000,
        });
        
        utteranceIndex++;
      } else if (paragraph.trim()) {
        // Handle text without speaker prefix - assign to "unknown" speaker
        utterances.push({
          speaker: "0",
          text: paragraph.trim(),
          start: utteranceIndex * 5000,
          end: (utteranceIndex + 1) * 5000,
        });
        
        utteranceIndex++;
      }
    }
  }
  
  return utterances;
}

/**
 * Parses plain text into speaker format if it doesn't have speaker labels already
 */
export function formatPlainTextAsSpeaker(text: string): string {
  if (!text) return "";
  
  // If the text already contains speaker labels, return as is
  if (text.match(/^SPEAKER \d+:/m)) {
    return text;
  }
  
  // For large texts, process in chunks
  if (text.length > 50000) { // 50KB threshold
    const chunks = [];
    const CHUNK_SIZE = 20000; // 20KB chunks
    
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.substring(i, i + CHUNK_SIZE));
    }
    
    // Process each chunk separately and combine results
    const processedChunks = chunks.map(chunk => {
      const paragraphs = chunk.split(/\n\s*\n/).filter(p => p.trim());
      if (paragraphs.length === 0) {
        return "";
      }
      return paragraphs.map(p => "SPEAKER 1: " + p.trim()).join("\n\n");
    });
    
    return processedChunks.join("\n\n");
  }
  
  // For smaller texts, process normally
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return "SPEAKER 1: " + text.trim();
  }
  
  return paragraphs.map(p => "SPEAKER 1: " + p.trim()).join("\n\n");
}
