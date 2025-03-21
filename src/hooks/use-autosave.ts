
import { useState, useEffect, useRef } from 'react';

interface AutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void> | void;
  interval?: number;
  debounce?: number;
  saveOnUnmount?: boolean;
  enabled?: boolean;
  showSuccessToast?: boolean; // Nuevo parámetro para controlar si se muestra el toast
}

/**
 * Hook for automatically saving data at intervals or with debounce
 */
export function useAutosave<T>({
  data,
  onSave,
  interval = 0,
  debounce = 1000,
  saveOnUnmount = true,
  enabled = true,
  showSuccessToast = false // Por defecto, no mostramos toasts
}: AutosaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const dataRef = useRef(data);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Function to perform the save operation
  const saveData = async () => {
    if (!enabled) return;
    
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      await onSave(dataRef.current);
      setLastSavedAt(new Date());
      setSaveSuccess(true);
    } catch (error) {
      console.error('Autosave failed:', error);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced save
  useEffect(() => {
    if (!enabled) return;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    // Set a new timeout
    if (debounce > 0) {
      timeoutRef.current = window.setTimeout(saveData, debounce);
    }
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounce, enabled]);

  // Interval save
  useEffect(() => {
    if (!enabled || interval <= 0) return;
    
    // Set interval for saving
    intervalRef.current = window.setInterval(saveData, interval);
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [interval, enabled]);

  // Save on unmount if enabled
  useEffect(() => {
    return () => {
      if (saveOnUnmount && enabled) {
        saveData();
      }
    };
  }, [saveOnUnmount, enabled]);

  // Force save function
  const forceSave = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    return saveData();
  };

  return {
    isSaving,
    lastSavedAt,
    saveSuccess,
    forceSave
  };
}
