
import React from 'react';
import { FileAudio, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioFileHeaderProps } from './types';

export const AudioFileHeader: React.FC<AudioFileHeaderProps> = ({
  file,
  index,
  onRemove,
  onTogglePlayer
}) => {
  const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <FileAudio className="w-5 h-5" />
        <div>
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-gray-500">
            {fileSizeInMB} MB
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          size="icon" 
          variant="ghost"
          onClick={onTogglePlayer}
          title="Play/Preview Audio"
        >
          <Play className="w-4 h-4 text-primary" />
        </Button>
        {onRemove && (
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive/90"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AudioFileHeader;
