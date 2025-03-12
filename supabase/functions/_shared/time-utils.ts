
// Helper functions for time formatting and calculations

/**
 * Formats milliseconds into HH:MM:SS format
 */
export const formatTimestamp = (milliseconds: number): string => {
  if (!milliseconds && milliseconds !== 0) return "00:00:00";
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Calculates segment timestamps based on video duration
 */
export const calculateSegmentTimestamps = (
  duration: number, 
  segmentIndex: number, 
  totalSegments: number
): { start: number, end: number } => {
  if (!duration) return { start: 0, end: 0 };
  
  const segmentDuration = duration / totalSegments;
  const start = Math.round(segmentIndex * segmentDuration);
  const end = Math.round((segmentIndex + 1) * segmentDuration);
  
  return { start, end };
};

/**
 * Converts timestamp format "00:00:00" to milliseconds
 */
export const convertTimestampToMs = (timestamp: string): number => {
  if (!timestamp || typeof timestamp !== 'string') return 0;
  
  const parts = timestamp.split(':');
  if (parts.length !== 3) return 0;
  
  try {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  } catch (e) {
    console.error('Error converting timestamp:', e);
    return 0;
  }
};
