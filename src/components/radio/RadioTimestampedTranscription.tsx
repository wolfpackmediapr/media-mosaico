
import { useState, useMemo } from "react";
import { TranscriptionResult, SentenceTimestamp, WordTimestamp } from "@/services/audio/transcriptionService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RadioTimestampedTranscriptionProps {
  transcriptionResult?: TranscriptionResult;
  text: string;
  onTimestampClick?: (timestamp: number) => void;
}

interface TimestampedItem {
  text: string;
  start: number;
  end: number;
  type: 'sentence' | 'word';
}

const RadioTimestampedTranscription = ({
  transcriptionResult,
  text,
  onTimestampClick
}: RadioTimestampedTranscriptionProps) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'sentence' | 'word'>(
    transcriptionResult?.sentences?.length ? 'sentence' : 'word'
  );
  
  // Generate timestamped items based on available data
  const timestampedItems = useMemo(() => {
    if (!transcriptionResult) return [];
    
    // If we have sentences with timestamps, use them (preferred)
    if (viewMode === 'sentence' && transcriptionResult.sentences && transcriptionResult.sentences.length > 0) {
      return transcriptionResult.sentences.map(sentence => ({
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
        type: 'sentence' as const
      }));
    }
    
    // Fall back to word-level timestamps
    if (transcriptionResult.words && transcriptionResult.words.length > 0) {
      return transcriptionResult.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end,
        type: 'word' as const
      }));
    }
    
    return [];
  }, [transcriptionResult, viewMode]);

  // Format time in appropriate format (MM:SS or MM:SS.ms)
  const formatTime = (msTime: number, includeMilliseconds = false) => {
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
  
  const handleItemClick = (timestamp: number) => {
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };
  
  const toggleViewMode = () => {
    if (viewMode === 'sentence' && transcriptionResult?.words?.length) {
      setViewMode('word');
    } else if (viewMode === 'word' && transcriptionResult?.sentences?.length) {
      setViewMode('sentence');
    }
  };

  const downloadSRT = () => {
    if (timestampedItems.length === 0) {
      toast({
        title: "Error al descargar",
        description: "No hay datos de timestamping disponibles",
        variant: "destructive",
      });
      return;
    }

    let srtContent = '';
    timestampedItems.forEach((item, index) => {
      const startTime = formatSrtTime(item.start);
      const endTime = formatSrtTime(item.end);
      
      // SRT format: index, time range, text, blank line
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${item.text}\n\n`;
    });
    
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcripcion-${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Descarga completada",
      description: "Archivo SRT de subtítulos creado correctamente",
    });
  };
  
  // Format time specifically for SRT format: 00:00:00,000
  const formatSrtTime = (msTime: number) => {
    const seconds = msTime / 1000;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  };
  
  const canToggleViewMode = Boolean(
    transcriptionResult?.sentences?.length && 
    transcriptionResult?.words?.length
  );
  
  if (timestampedItems.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground">No hay datos de timestamps disponibles</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <div className="p-2 bg-muted/20 flex justify-between items-center">
        <div className="flex gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {viewMode === 'sentence' ? 'Vista por Oraciones' : 'Vista por Palabras'}
          </span>
          {canToggleViewMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleViewMode}
              className="h-7 text-xs"
            >
              {viewMode === 'sentence' ? 'Cambiar a Palabras' : 'Cambiar a Oraciones'}
            </Button>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={downloadSRT}
          className="h-7"
          title="Descargar como subtítulos SRT"
        >
          <Download className="h-3 w-3 mr-1" /> SRT
        </Button>
      </div>
      <ScrollArea className="h-[200px] rounded-md">
        <div className="space-y-1 p-2">
          {timestampedItems.map((item, index) => (
            <div 
              key={`${item.type}-${index}`} 
              className="flex hover:bg-muted/50 rounded-sm p-1 cursor-pointer group"
              onClick={() => handleItemClick(item.start)}
            >
              <span className="text-xs font-mono bg-primary/10 text-primary px-1 rounded mr-2 min-w-14 text-center group-hover:bg-primary group-hover:text-white">
                {formatTime(item.start, viewMode === 'word')}
              </span>
              <span className={`text-sm flex-1 ${viewMode === 'word' ? 'mr-1' : ''}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RadioTimestampedTranscription;
