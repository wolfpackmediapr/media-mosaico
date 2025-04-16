
import { formatSrtTime } from "./timeUtils";
import { TimestampedItem } from "./ViewModeManager";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

export const useTimestampedDownload = () => {
  const downloadSRT = (
    items: TimestampedItem[],
    customContent?: string | null
  ) => {
    if (customContent) {
      // Use custom pre-formatted content if provided
      downloadTextFile(customContent, "transcript.txt");
      return;
    }

    // Generate SRT format
    let srtContent = "";
    
    items.forEach((item, index) => {
      const i = index + 1;
      const startFormatted = formatSrtTime(item.start);
      const endFormatted = formatSrtTime(item.end);
      
      // Add speaker prefix for speaker items
      const text = item.type === 'speaker' && item.speaker 
        ? `SPEAKER ${item.speaker}: ${item.text}`
        : item.text;
      
      srtContent += `${i}\n${startFormatted} --> ${endFormatted}\n${text}\n\n`;
    });
    
    downloadTextFile(srtContent, "transcript.srt");
  };
  
  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return { downloadSRT };
};
