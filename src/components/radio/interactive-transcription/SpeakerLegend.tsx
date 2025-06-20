
import React, { useMemo } from "react";
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { getSpeakerColor } from "./utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface SpeakerLegendProps {
  utterances: UtteranceTimestamp[];
}

const SpeakerLegend: React.FC<SpeakerLegendProps> = ({ utterances }) => {
  // Extract unique speakers with memoization
  const uniqueSpeakers = useMemo(() => {
    if (!utterances || utterances.length === 0) return [];
    return Array.from(
      new Set(utterances.map((u) => u.speaker))
    ).sort();
  }, [utterances]);

  // Format speaker name for display
  const formatSpeakerName = (speaker: string | number) => {
    if (typeof speaker === 'string') {
      return speaker.includes('_') ? 
        `Speaker ${speaker.split('_')[1]}` : 
        `Speaker ${speaker}`;
    }
    return `Speaker ${speaker}`;
  };

  if (!uniqueSpeakers.length) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">{uniqueSpeakers.length} Hablantes</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <h4 className="text-sm font-medium mb-2">Identificación de Hablantes</h4>
        <div className="space-y-2">
          {uniqueSpeakers.map((speaker) => (
            <div key={`speaker-legend-${speaker}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getSpeakerColor(speaker) }}
              />
              <span className="text-xs">
                {formatSpeakerName(speaker)}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default React.memo(SpeakerLegend);
