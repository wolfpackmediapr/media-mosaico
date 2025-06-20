
import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useSpeakerLabels } from "@/hooks/radio/speaker-labels/useSpeakerLabels";
import SpeakerNameInput from "@/components/radio/speaker-labels/SpeakerNameInput";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface SpeakerManagementProps {
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
}

const SpeakerManagement: React.FC<SpeakerManagementProps> = ({ 
  transcriptionResult,
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

  // Generate unique speakers list
  const speakers = useMemo(() => {
    const utterances = transcriptionResult?.utterances || [];
    const uniqueSpeakers = new Set<string>();
    utterances.forEach(utterance => {
      if (utterance.speaker) {
        uniqueSpeakers.add(utterance.speaker.toString());
      }
    });
    return Array.from(uniqueSpeakers).sort();
  }, [transcriptionResult?.utterances]);

  // Color mapping for speakers
  const speakerColors = useMemo(() => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
      '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
    ];
    const colorMap: Record<string, string> = {};
    speakers.forEach((speaker, index) => {
      colorMap[speaker] = colors[index % colors.length];
    });
    return colorMap;
  }, [speakers]);

  const getSpeakerColor = (speaker: string) => {
    return speakerColors[speaker] || '#6B7280';
  };

  if (speakers.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No speakers found in this transcription.</p>
      </div>
    );
  }

  const handleClearAll = async () => {
    if (window.confirm('¿Está seguro de que desea restablecer todos los nombres de los hablantes a sus valores originales?')) {
      await clearAllSpeakerLabels();
    }
  };

  const hasAnyCustomNames = speakers.some(speaker => hasCustomName(speaker));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Gestión de Hablantes</h3>
        {hasAnyCustomNames && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAll}
            disabled={isSaving}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restablecer Todo
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {speakers.map((speaker) => {
          const displayName = getSpeakerDisplayName(speaker);
          const customName = hasCustomName(speaker);
          
          return (
            <div key={speaker} className="flex items-center gap-3 p-3 border rounded-lg">
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
              <span className="text-sm text-gray-500">→</span>
              <div className="flex-1">
                <SpeakerNameInput
                  originalSpeaker={speaker}
                  displayName={displayName}
                  hasCustomName={customName}
                  onSave={saveSpeakerLabel}
                  onDelete={deleteSpeakerLabel}
                  isInline={false}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-gray-500 mt-3">
        Haga clic en cualquier nombre de hablante para personalizarlo. Los nombres personalizados se utilizarán en toda esta transcripción.
      </p>
    </div>
  );
};

export default SpeakerManagement;
