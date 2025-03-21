
import { QueryClient } from "@tanstack/react-query";

/**
 * Custom cache options for different data types
 */
export const CACHE_TIME = {
  CRITICAL: 5 * 60 * 1000, // 5 minutes
  STANDARD: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  EXTENDED: 24 * 60 * 60 * 1000, // 1 day
};

/**
 * Custom stale times for different data types
 */
export const STALE_TIME = {
  CRITICAL: 30 * 1000, // 30 seconds
  STANDARD: 2 * 60 * 1000, // 2 minutes
  LONG: 10 * 60 * 1000, // 10 minutes
  EXTENDED: 60 * 60 * 1000, // 1 hour
};

/**
 * Smart cache updater to update entities in a cached collection
 * 
 * @param queryClient - React Query client
 * @param queryKey - Key for the query to update
 * @param updatedItem - Updated item
 * @param idField - ID field name in the entity
 */
export function updateCachedItem<T extends Record<string, any>>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updatedItem: T,
  idField: keyof T = 'id'
): void {
  queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
    if (!oldData) return [updatedItem];
    
    return oldData.map(item => 
      item[idField] === updatedItem[idField] ? updatedItem : item
    );
  });
}

/**
 * Remove an item from a cached collection
 * 
 * @param queryClient - React Query client
 * @param queryKey - Key for the query to update
 * @param itemId - ID of the item to remove
 * @param idField - ID field name in the entity
 */
export function removeCachedItem<T extends Record<string, any>>(
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string | number,
  idField: keyof T = 'id'
): void {
  queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
    if (!oldData) return [];
    return oldData.filter(item => item[idField] !== itemId);
  });
}

/**
 * Add a new item to a cached collection
 * 
 * @param queryClient - React Query client
 * @param queryKey - Key for the query to update
 * @param newItem - New item to add
 */
export function addCachedItem<T>(
  queryClient: QueryClient, 
  queryKey: unknown[], 
  newItem: T
): void {
  queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
    if (!oldData) return [newItem];
    return [...oldData, newItem];
  });
}
