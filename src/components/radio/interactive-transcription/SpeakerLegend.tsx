
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
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";
import SpeakerNameInput from "./SpeakerNameInput";

interface SpeakerLegendProps {
  utterances: UtteranceTimestamp[];
  transcriptionId?: string;
}

const SpeakerLegend: React.FC<SpeakerLegendProps> = ({ utterances, transcriptionId }) => {
  // Extract unique speakers with memoization
  const uniqueSpeakers = useMemo(() => {
    if (!utterances || utterances.length === 0) return [];
    return Array.from(
      new Set(utterances.map((u) => u.speaker))
    ).sort();
  }, [utterances]);

  // Speaker labels hook
  const { getDisplayName, getCustomName, saveLabel, isSaving } = useSpeakerLabels({
    transcriptionId
  });

  // Format speaker name for display (fallback)
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
      <PopoverContent className="w-80 p-3">
        <h4 className="text-sm font-medium mb-3">Identificación de Hablantes</h4>
        <div className="space-y-3">
          {uniqueSpeakers.map((speaker) => {
            const defaultName = formatSpeakerName(speaker);
            const customName = getCustomName(String(speaker));
            
            return (
              <div key={`speaker-legend-${speaker}`} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getSpeakerColor(speaker) }}
                />
                <SpeakerNameInput
                  originalSpeaker={String(speaker)}
                  customName={customName}
                  defaultName={defaultName}
                  onSave={(name) => saveLabel(String(speaker), name)}
                  isSaving={isSaving}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          Haz clic en el ícono de edición para personalizar los nombres de los hablantes
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default React.memo(SpeakerLegend);
