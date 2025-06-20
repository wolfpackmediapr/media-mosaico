
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpeakerLabel {
  id: string;
  transcription_id: string;
  original_speaker: string;
  custom_name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface UseSpeakerLabelsProps {
  transcriptionId?: string;
}

export const useSpeakerLabels = ({ transcriptionId }: UseSpeakerLabelsProps) => {
  const [speakerLabels, setSpeakerLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load speaker labels for the current transcription
  const loadSpeakerLabels = useCallback(async () => {
    if (!transcriptionId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('speaker_labels')
        .select('*')
        .eq('transcription_id', transcriptionId);

      if (error) throw error;

      const labels: Record<string, string> = {};
      data?.forEach((label: SpeakerLabel) => {
        labels[label.original_speaker] = label.custom_name;
      });

      setSpeakerLabels(labels);
    } catch (error) {
      console.error('Error loading speaker labels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [transcriptionId]);

  // Save or update a speaker label
  const saveSpeakerLabel = useCallback(async (originalSpeaker: string, customName: string) => {
    if (!transcriptionId || !customName.trim()) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('speaker_labels')
        .upsert({
          transcription_id: transcriptionId,
          original_speaker: originalSpeaker,
          custom_name: customName.trim(),
          user_id: user.id
        }, {
          onConflict: 'transcription_id,original_speaker,user_id'
        });

      if (error) throw error;

      // Update local state
      setSpeakerLabels(prev => ({
        ...prev,
        [originalSpeaker]: customName.trim()
      }));

    } catch (error) {
      console.error('Error saving speaker label:', error);
      toast.error('Failed to save speaker name');
    } finally {
      setIsSaving(false);
    }
  }, [transcriptionId]);

  // Delete a speaker label
  const deleteSpeakerLabel = useCallback(async (originalSpeaker: string) => {
    if (!transcriptionId) return;

    try {
      const { error } = await supabase
        .from('speaker_labels')
        .delete()
        .eq('transcription_id', transcriptionId)
        .eq('original_speaker', originalSpeaker);

      if (error) throw error;

      // Update local state
      setSpeakerLabels(prev => {
        const updated = { ...prev };
        delete updated[originalSpeaker];
        return updated;
      });

    } catch (error) {
      console.error('Error deleting speaker label:', error);
      toast.error('Failed to delete speaker name');
    }
  }, [transcriptionId]);

  // Clear all speaker labels for this transcription
  const clearAllSpeakerLabels = useCallback(async () => {
    if (!transcriptionId) return;

    try {
      const { error } = await supabase
        .from('speaker_labels')
        .delete()
        .eq('transcription_id', transcriptionId);

      if (error) throw error;

      setSpeakerLabels({});
      toast.success('All speaker names cleared');

    } catch (error) {
      console.error('Error clearing speaker labels:', error);
      toast.error('Failed to clear speaker names');
    }
  }, [transcriptionId]);

  // Get display name for a speaker
  const getSpeakerDisplayName = useCallback((originalSpeaker: string) => {
    return speakerLabels[originalSpeaker] || originalSpeaker;
  }, [speakerLabels]);

  // Check if a speaker has a custom name
  const hasCustomName = useCallback((originalSpeaker: string) => {
    return originalSpeaker in speakerLabels;
  }, [speakerLabels]);

  // Load labels when transcriptionId changes
  useEffect(() => {
    if (transcriptionId) {
      loadSpeakerLabels();
    } else {
      setSpeakerLabels({});
    }
  }, [transcriptionId, loadSpeakerLabels]);

  return {
    speakerLabels,
    isLoading,
    isSaving,
    saveSpeakerLabel,
    deleteSpeakerLabel,
    clearAllSpeakerLabels,
    getSpeakerDisplayName,
    hasCustomName,
    reloadSpeakerLabels: loadSpeakerLabels
  };
};
