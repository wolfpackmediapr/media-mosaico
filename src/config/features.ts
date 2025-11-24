/**
 * Feature flags for gradual rollout of new features
 */
export const FEATURES = {
  /**
   * Use Gemini File Search API for Prensa Escrita processing
   * - true: New File Search flow (99% cost savings, citations, better search)
   * - false: Legacy OCR flow (current implementation)
   */
  USE_FILE_SEARCH: import.meta.env.VITE_USE_FILE_SEARCH === 'true'
};
