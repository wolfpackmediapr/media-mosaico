
import { usePressGenres } from "./press/usePressGenres";
import { usePressSections } from "./press/usePressSections";
import { usePressSources } from "./press/usePressSources";
import { usePressRates } from "./press/usePressRates";

export function usePressSettings() {
  const {
    genres,
    loadingGenres,
    loadGenres,
    addGenre,
    updateGenre: updateGenreById,
    removeGenre
  } = usePressGenres();
  
  const {
    sections,
    loadingSections,
    loadSections,
    addSection,
    updateSection: updateSectionById,
    removeSection
  } = usePressSections();
  
  const {
    sources,
    loadingSources,
    loadSources,
    addSource,
    updateSource: updateSourceById,
    removeSource
  } = usePressSources();
  
  const {
    rates,
    loadingRates,
    loadRates,
    addRate,
    updateRate: updateRateById,
    removeRate
  } = usePressRates();
  
  // Wrapper functions to maintain the original interface
  const updateGenre = (id: string, name: string) => updateGenreById(id, name);
  const updateSection = (id: string, name: string) => updateSectionById(id, name);
  const updateSource = (id: string, name: string) => updateSourceById(id, name);
  const updateRate = (id: string, name: string) => updateRateById(id, name);

  return {
    // Genres
    genres,
    loadingGenres,
    loadGenres,
    addGenre,
    updateGenre,
    removeGenre,
    
    // Sections
    sections,
    loadingSections,
    loadSections,
    addSection,
    updateSection,
    removeSection,
    
    // Sources
    sources,
    loadingSources,
    loadSources,
    addSource,
    updateSource,
    removeSource,
    
    // Rates
    rates,
    loadingRates,
    loadRates,
    addRate,
    updateRate,
    removeRate
  };
}
