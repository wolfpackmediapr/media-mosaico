
import { MoreHorizontal, PlayCircle, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadedFile extends File {
  preview?: string;
}

interface TrackListProps {
  files: UploadedFile[];
  currentFileIndex: number;
  onSelectTrack: (index: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

const TrackList = ({
  files,
  currentFileIndex,
  onSelectTrack,
  isPlaying,
  currentTime,
  duration,
}: TrackListProps) => {
  if (files.length === 0) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Publimedia brand color
  const publimediaGreen = "#66cc00";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lista de Pistas ({files.length})</span>
          <span className="text-sm font-normal">
            {currentFileIndex + 1} de {files.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {files.map((file, index) => {
            const isActive = index === currentFileIndex;
            const progress = isActive ? (currentTime / (duration || 1)) * 100 : 0;
            
            return (
              <li key={index} className={cn(
                "relative p-3 flex items-center hover:bg-muted/50 transition-colors cursor-pointer",
                isActive && "bg-muted"
              )}
              onClick={() => onSelectTrack(index)}
              >
                {/* Progress bar for current track */}
                {isActive && (
                  <div 
                    className="absolute bottom-0 left-0 h-0.5 bg-primary" 
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: publimediaGreen
                    }}
                  ></div>
                )}
                
                {/* Track number */}
                <div className="w-8 flex-shrink-0 text-muted-foreground text-sm font-medium">
                  {index + 1}
                </div>
                
                {/* Track info */}
                <div className="flex-grow truncate mr-2">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                    {isActive && ` • ${formatTime(currentTime)} / ${formatTime(duration)}`}
                  </div>
                </div>
                
                {/* Track status icon */}
                <div className="flex-shrink-0">
                  {isActive && isPlaying ? (
                    <Volume2 size={16} className="text-primary" style={{color: publimediaGreen}} />
                  ) : (
                    <PlayCircle size={16} className={isActive ? "text-primary" : "text-muted-foreground"} style={isActive ? {color: publimediaGreen} : {}} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default TrackList;
