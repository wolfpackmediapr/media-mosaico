
import { Source } from "../types/press-types";

// Cache the initial rates to avoid recreating the array on each call
let cachedRates: Source[] | null = null;

export const getInitialRates = (): Source[] => {
  // Return cached version if available
  if (cachedRates) {
    return cachedRates;
  }
  
  // Create and cache the rates if not already cached
  cachedRates = [
    { id: "1", name: "PLANA COMPLETA" },
    { id: "2", name: "MEDIA PLANA" },
    { id: "3", name: "CUARTO DE PLANA" },
    { id: "4", name: "OCTAVO DE PLANA" },
    { id: "5", name: "ROBAPLANA" },
    { id: "6", name: "CINTILLO" },
    { id: "7", name: "MÓDULO" },
    { id: "8", name: "PUBLICIDAD ESPECIAL" },
  ];
  
  return cachedRates;
};

// For testing purposes: clear the cache
export const clearRatesCache = (): void => {
  cachedRates = null;
};
