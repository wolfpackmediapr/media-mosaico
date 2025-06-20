
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useSpeakerLabels } from "@/hooks/radio/speaker-labels/useSpeakerLabels";
import SpeakerNameInput from "@/components/radio/speaker-labels/SpeakerNameInput";

interface SpeakerLegendProps {
  speakers: string[];
  getSpeakerColor: (speaker: string) => string;
  transcriptionId?: string;
}

const SpeakerLegend: React.FC<SpeakerLegendProps> = ({ 
  speakers, 
  getSpeakerColor,
  transcriptionId 
}) => {
  const {
    saveSpeakerLabel,
    deleteSpeakerLabel,
    clearAllSpeakerLabels,
    getSpeakerDisplayName,
    hasCustomName,
    isSaving
  } = useSpeakerLabels({ transcriptionId });

  if (speakers.length === 0) return null;

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to reset all speaker names to their original values?')) {
      await clearAllSpeakerLabels();
    }
  };

  const hasAnyCustomNames = speakers.some(speaker => hasCustomName(speaker));

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Speakers</h3>
        {hasAnyCustomNames && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAll}
            disabled={isSaving}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {speakers.map((speaker) => {
          const displayName = getSpeakerDisplayName(speaker);
          const customName = hasCustomName(speaker);
          
          return (
            <div key={speaker} className="flex items-center gap-1">
              <Badge
                variant="secondary"
                className="text-xs px-2 py-1"
                style={{
                  backgroundColor: getSpeakerColor(speaker),
                  color: 'white'
                }}
              >
                {speaker}
              </Badge>
              <span className="text-xs text-gray-500">→</span>
              <SpeakerNameInput
                originalSpeaker={speaker}
                displayName={displayName}
                hasCustomName={customName}
                onSave={saveSpeakerLabel}
                onDelete={deleteSpeakerLabel}
                isInline={true}
                className="text-xs"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Click on any speaker name to customize it. Custom names will be used throughout this transcription.
      </p>
    </div>
  );
};

export default SpeakerLegend;
