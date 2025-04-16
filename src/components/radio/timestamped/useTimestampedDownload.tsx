
import { useState } from "react";
import { formatSrtTime } from "./timeUtils";

interface TimestampedItem {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker?: string;
}

export const useTimestampedDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const generateSRT = (items: TimestampedItem[]) => {
    if (!items || items.length === 0) return "";
    
    return items.map((item, index) => {
      const speakerPrefix = item.speaker ? `SPEAKER ${item.speaker}: ` : "";
      const itemNumber = index + 1;
      const startTime = formatSrtTime(item.start);
      const endTime = formatSrtTime(item.end);
      
      return `${itemNumber}\n${startTime} --> ${endTime}\n${speakerPrefix}${item.text}\n`;
    }).join('\n');
  };
  
  const downloadSRT = (items: TimestampedItem[], preformattedContent?: string | null) => {
    try {
      setIsDownloading(true);
      
      // Generate SRT content
      let srtContent = preformattedContent;
      
      if (!srtContent) {
        srtContent = generateSRT(items);
      }
      
      // Create a blob and trigger download
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription_${new Date().getTime()}.srt`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error generating SRT file:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  return { isDownloading, downloadSRT };
};
