
/**
 * Hook for using Typeform resource manager throughout the app
 */
import { useTypeformResourceManager } from '@/utils/typeform/typeform-resource-manager';
import type { TypeformResourceManager } from '@/utils/typeform/types';

/**
 * React hook to access the Typeform resource manager
 * @returns TypeformResourceManager instance
 */
export const useTypeformResourceManager = (): TypeformResourceManager => {
  // Use the resource manager from utils
  return useTypeformResourceManager();
};

// Re-export types
export type { TypeformResourceManager } from '@/utils/typeform/types';
