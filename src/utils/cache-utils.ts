
/**
 * Cache utilities for the application
 */

// Constants for cache keys
export const CACHE_KEYS = {
  NEWS_FEED: 'news_feed_cache',
  SOCIAL_FEED: 'social_feed_cache',
  VIDEO_TRANSCRIPTION: 'video_transcription_cache',
  USER_PREFERENCES: 'user_preferences',
};

// Default cache duration (24 hours in milliseconds)
export const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Get data from cache
 * @param key The cache key
 * @param maxAge Maximum age in milliseconds before cache is invalid
 * @returns The cached data or null if not found or expired
 */
export function getFromCache<T>(key: string, maxAge = DEFAULT_CACHE_DURATION): T | null {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;
    
    const { data, timestamp } = JSON.parse(cachedData);
    
    // Check if cache is expired
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data as T;
  } catch (error) {
    console.error(`Error retrieving cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Save data to cache
 * @param key The cache key
 * @param data The data to cache
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error(`Error saving cache for key ${key}:`, error);
  }
}

/**
 * Clear a specific cache
 * @param key The cache key to clear
 */
export function clearCache(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clear all application caches
 */
export function clearAllCaches(): void {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Check if a cache entry exists and is valid
 * @param key The cache key
 * @param maxAge Maximum age in milliseconds
 * @returns True if cache exists and is valid
 */
export function cacheExists(key: string, maxAge = DEFAULT_CACHE_DURATION): boolean {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return false;
    
    const { timestamp } = JSON.parse(cachedData);
    return Date.now() - timestamp <= maxAge;
  } catch {
    return false;
  }
}
