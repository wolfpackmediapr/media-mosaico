
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';

interface SpeakerLabel {
  id: string;
  original_speaker: string;
  custom_name: string;
  transcription_id: string;
  user_id: string;
}

interface UseSpeakerLabelsProps {
  transcriptionId?: string;
}

export const useSpeakerLabels = ({ transcriptionId }: UseSpeakerLabelsProps) => {
  const [speakerLabels, setSpeakerLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load existing speaker labels
  const loadSpeakerLabels = useCallback(async () => {
    if (!transcriptionId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('speaker_labels')
        .select('original_speaker, custom_name')
        .eq('transcription_id', transcriptionId);

      if (!error && data) {
        const labelsMap = data.reduce((acc, label) => {
          acc[label.original_speaker] = label.custom_name;
          return acc;
        }, {} as Record<string, string>);
        setSpeakerLabels(labelsMap);
      }
    } catch (error) {
      console.error('Error loading speaker labels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [transcriptionId]);

  // Save speaker label mutation - Fixed upsert logic
  const saveLabelMutation = useOptimisticMutation({
    mutationFn: async ({ originalSpeaker, customName }: { originalSpeaker: string; customName: string }) => {
      if (!transcriptionId) throw new Error('No transcription ID');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No authenticated user');

      // First, try to find existing record
      const { data: existing } = await supabase
        .from('speaker_labels')
        .select('id')
        .eq('transcription_id', transcriptionId)
        .eq('original_speaker', originalSpeaker)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('speaker_labels')
          .update({ custom_name: customName })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('speaker_labels')
          .insert({
            transcription_id: transcriptionId,
            original_speaker: originalSpeaker,
            custom_name: customName,
            user_id: user.user.id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onMutate: ({ originalSpeaker, customName }) => {
      // Optimistic update
      setSpeakerLabels(prev => ({
        ...prev,
        [originalSpeaker]: customName
      }));
    },
    onError: (error, { originalSpeaker }) => {
      // Revert optimistic update on error
      setSpeakerLabels(prev => {
        const updated = { ...prev };
        delete updated[originalSpeaker];
        return updated;
      });
      console.error('Error saving speaker label:', error);
    }
  });

  // Delete speaker label mutation
  const deleteLabelMutation = useOptimisticMutation({
    mutationFn: async (originalSpeaker: string) => {
      if (!transcriptionId) throw new Error('No transcription ID');

      const { error } = await supabase
        .from('speaker_labels')
        .delete()
        .eq('transcription_id', transcriptionId)
        .eq('original_speaker', originalSpeaker);

      if (error) throw error;
    },
    onMutate: (originalSpeaker) => {
      // Optimistic update
      setSpeakerLabels(prev => {
        const updated = { ...prev };
        delete updated[originalSpeaker];
        return updated;
      });
    }
  });

  // Load labels when transcription ID changes
  useEffect(() => {
    loadSpeakerLabels();
  }, [loadSpeakerLabels]);

  const saveLabel = useCallback((originalSpeaker: string, customName: string) => {
    if (customName.trim()) {
      saveLabelMutation.mutate({ originalSpeaker, customName: customName.trim() });
    } else {
      deleteLabelMutation.mutate(originalSpeaker);
    }
  }, [saveLabelMutation, deleteLabelMutation]);

  const getCustomName = useCallback((originalSpeaker: string) => {
    return speakerLabels[originalSpeaker] || '';
  }, [speakerLabels]);

  const getDisplayName = useCallback((originalSpeaker: string) => {
    const customName = getCustomName(originalSpeaker);
    if (customName) return customName;
    
    // Format original speaker name
    if (typeof originalSpeaker === 'string') {
      return originalSpeaker.includes('_') ? 
        `Speaker ${originalSpeaker.split('_')[1]}` : 
        `Speaker ${originalSpeaker}`;
    }
    return `Speaker ${originalSpeaker}`;
  }, [getCustomName]);

  return {
    speakerLabels,
    isLoading,
    saveLabel,
    getCustomName,
    getDisplayName,
    isSaving: saveLabelMutation.isLoading,
    isDeleting: deleteLabelMutation.isLoading
  };
};
