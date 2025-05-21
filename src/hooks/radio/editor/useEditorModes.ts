
import { useState, useCallback } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';

interface UseEditorModesProps {
  transcriptionId?: string;
  hasTimestampData: boolean;
}

/**
 * A hook to manage the editor view modes (timestamps vs edit mode)
 * with persistence
 */
export const useEditorModes = ({ 
  transcriptionId, 
  hasTimestampData 
}: UseEditorModesProps) => {
  // Create key for persistent state
  const viewModeKey = `transcription-view-mode-${transcriptionId || "draft"}`;
  const editModeKey = `transcription-editor-mode-${transcriptionId || "draft"}`;
  
  // Persistent view mode (interactive vs edit)
  const [viewMode, setViewMode, removeViewMode] = usePersistentState<'interactive' | 'edit'>(
    viewModeKey,
    'edit',
    { storage: 'sessionStorage' }
  );
  
  // Persistent edit mode state
  const [isEditing, setIsEditing, removeEditMode] = usePersistentState(
    editModeKey,
    false,
    { storage: 'sessionStorage' }
  );
  
  // Derived state - should we show timestamps
  const showTimestamps = viewMode === 'interactive' && hasTimestampData;
  
  // Toggle timestamp view
  const toggleTimestampView = useCallback(() => {
    setViewMode(prev => prev === 'interactive' ? 'edit' : 'interactive');
  }, [setViewMode]);
  
  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditing(prev => !prev);
  }, [setIsEditing]);
  
  // Reset all modes
  const resetModes = useCallback(() => {
    removeViewMode();
    removeEditMode();
    setViewMode('edit');
    setIsEditing(false);
  }, [removeViewMode, removeEditMode, setViewMode, setIsEditing]);
  
  return {
    viewMode,
    isEditing,
    showTimestamps,
    setViewMode,
    setIsEditing,
    toggleTimestampView,
    toggleEditMode,
    resetModes
  };
};
