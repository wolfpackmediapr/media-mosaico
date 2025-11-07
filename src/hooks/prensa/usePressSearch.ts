import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchResult } from "./types";
import { ERROR_MESSAGES } from "./constants";
import { showErrorToast } from "./errors";

const DEBOUNCE_DELAY_MS = 300;

export const usePressSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cachedResults, setCachedResults] = useState<Map<string, SearchResult[]>>(new Map());
  const debounceTimerRef = useRef<number | null>(null);

  const searchClippings = useCallback(async (
    query: string,
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<SearchResult[]> => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    return new Promise((resolve) => {
      debounceTimerRef.current = window.setTimeout(async () => {
        if (!query || query.trim().length === 0) {
          setSearchError(ERROR_MESSAGES.SEARCH_QUERY_REQUIRED);
          resolve([]);
          return;
        }

        // Check cache first
        const cacheKey = `${query}-${limit}-${threshold}`;
        const cached = cachedResults.get(cacheKey);
        if (cached) {
          console.log("Returning cached search results");
          setSearchResults(cached);
          setSearchError(null);
          resolve(cached);
          return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
          console.log(`Searching for: "${query}" with limit ${limit} and threshold ${threshold}`);

          const { data, error } = await supabase.functions.invoke("search-press-clippings", {
            body: {
              query: query.trim(),
              limit,
              threshold,
            },
          });

          if (error) {
            console.error("Error searching clippings:", error);
            const errorMessage = `Error en la búsqueda: ${error.message}`;
            setSearchError(errorMessage);
            showErrorToast("Error de búsqueda", errorMessage);
            resolve([]);
            return;
          }

          const results = data?.results || [];
          console.log(`Found ${results.length} results`);

          // Cache the results
          setCachedResults(prev => new Map(prev).set(cacheKey, results));
          setSearchResults(results);
          resolve(results);
        } catch (err) {
          console.error("Exception during search:", err);
          const errorMessage = err instanceof Error ? err.message : "Error desconocido en la búsqueda";
          setSearchError(errorMessage);
          showErrorToast("Error de búsqueda", errorMessage);
          resolve([]);
        } finally {
          setIsSearching(false);
        }
      }, DEBOUNCE_DELAY_MS);
    });
  }, [cachedResults]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const clearCache = useCallback(() => {
    setCachedResults(new Map());
  }, []);

  return {
    searchClippings,
    isSearching,
    searchResults,
    searchError,
    setSearchResults,
    clearSearch,
    clearCache
  };
};
