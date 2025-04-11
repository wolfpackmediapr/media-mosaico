
/**
 * Format time in appropriate format (MM:SS or MM:SS.ms)
 */
export const formatTime = (msTime: number, includeMilliseconds = false) => {
  // Convert to seconds first
  const seconds = msTime / 1000;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  
  if (includeMilliseconds) {
    const formattedMs = String(milliseconds).padStart(3, '0');
    return `${formattedMinutes}:${formattedSeconds}.${formattedMs}`;
  }
  
  return `${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Format time specifically for SRT format: 00:00:00,000
 */
export const formatSrtTime = (msTime: number) => {
  const seconds = msTime / 1000;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
};
