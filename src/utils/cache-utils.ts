
// Cache durations in milliseconds
const CACHE_DURATIONS = {
  default: 5 * 60 * 1000, // 5 minutes
  feedSources: 10 * 60 * 1000, // 10 minutes
  socialPlatforms: 10 * 60 * 1000, // 10 minutes
  articles: 2 * 60 * 1000, // 2 minutes
  socialPosts: 2 * 60 * 1000, // 2 minutes
};

interface CachedItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Save data to cache with expiration
 */
export function saveCacheData<T>(key: string, data: T): void {
  try {
    const cacheType = key.split('_')[0];
    const expiry = Date.now() + (CACHE_DURATIONS[cacheType as keyof typeof CACHE_DURATIONS] || CACHE_DURATIONS.default);
    
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now(),
      expiry
    };
    
    localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    console.log(`Cached data for ${key}, expires in ${Math.round((expiry - Date.now()) / 1000 / 60)} minutes`);
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

/**
 * Retrieve data from cache if not expired
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    
    if (!cached) {
      return null;
    }
    
    const item: CachedItem<T> = JSON.parse(cached);
    
    // Check if cache has expired
    if (Date.now() > item.expiry) {
      console.log(`Cache for ${key} has expired`);
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    console.log(`Cache hit for ${key}, age: ${Math.round((Date.now() - item.timestamp) / 1000)} seconds`);
    return item.data;
  } catch (error) {
    console.error('Error retrieving from cache:', error);
    return null;
  }
}

/**
 * Clear all cached data or specific cache items
 */
export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(`cache_${key}`);
      console.log(`Cleared cache for ${key}`);
    } else {
      // Clear all cache items
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('cache_')) {
          localStorage.removeItem(k);
        }
      });
      console.log('Cleared all cache');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Invalidate all caches of a specific type
 */
export function invalidateCacheType(type: string): void {
  try {
    // Clear all cache items of specified type
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`cache_${type}`)) {
        localStorage.removeItem(key);
      }
    });
    console.log(`Invalidated all ${type} caches`);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}
