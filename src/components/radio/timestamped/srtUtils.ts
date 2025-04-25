
import { formatSrtTime } from "./timeUtils";
import { useToast } from "@/hooks/use-toast";

interface TimestampedItem {
  text: string;
  start: number;
  end: number;
  type: 'sentence' | 'word';
}

export const generateSrtContent = (timestampedItems: TimestampedItem[]): string => {
  let srtContent = '';
  
  timestampedItems.forEach((item, index) => {
    const startTime = formatSrtTime(item.start);
    const endTime = formatSrtTime(item.end);
    
    // SRT format: index, time range, text, blank line
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${item.text}\n\n`;
  });
  
  return srtContent;
};

export const downloadSrtFile = (timestampedItems: TimestampedItem[]) => {
  const { toast } = useToast();
  
  if (timestampedItems.length === 0) {
    toast.error("Error al descargar", "No hay datos de timestamping disponibles");
    return;
  }

  const srtContent = generateSrtContent(timestampedItems);
  const blob = new Blob([srtContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcripcion-${Date.now()}.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success("Descarga completada", "Archivo SRT de subtítulos creado correctamente");
};
