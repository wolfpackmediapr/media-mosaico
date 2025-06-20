
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useSpeakerLabels } from "@/hooks/radio/speaker-labels/useSpeakerLabels";

interface SpeakerSegmentProps {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  isCurrentSegment: boolean;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  getSpeakerColor: (speaker: string) => string;
  transcriptionId?: string;
}

const SpeakerSegment: React.FC<SpeakerSegmentProps> = ({
  speaker,
  text,
  startTime,
  isCurrentSegment,
  isPlaying,
  onSeek,
  onPlayPause,
  getSpeakerColor,
  transcriptionId,
}) => {
  const { getSpeakerDisplayName } = useSpeakerLabels({ transcriptionId });

  const formatTime = (timeInMs: number) => {
    const seconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = () => {
    onSeek(startTime);
  };

  const displayName = getSpeakerDisplayName(speaker);

  return (
    <div 
      className={`p-4 border rounded-lg transition-all duration-200 ${
        isCurrentSegment 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Badge
            variant="secondary"
            className="text-xs font-medium px-2 py-1 mb-2"
            style={{
              backgroundColor: getSpeakerColor(speaker),
              color: 'white'
            }}
          >
            {displayName}
          </Badge>
          <div className="text-xs text-gray-500 mb-2">
            {formatTime(startTime)}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeek}
              className="h-6 w-6 p-0"
              title={`Seek to ${formatTime(startTime)}`}
            >
              ⏯
            </Button>
            {isCurrentSegment && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPlayPause}
                className="h-6 w-6 p-0"
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpeakerSegment;
