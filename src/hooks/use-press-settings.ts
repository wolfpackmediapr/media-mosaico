
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchPressGenres,
  createPressGenre,
  updatePressGenre,
  deletePressGenre,
  fetchPressSections,
  createPressSection,
  updatePressSection,
  deletePressSection,
  fetchPressSources,
  createPressSource,
  updatePressSource,
  deletePressSource,
  fetchPressRates,
  createPressRate,
  updatePressRate,
  deletePressRate
} from "@/services/press/pressService";
import { PressGenreType, PressSectionType, PressSourceType, PressRateType } from "@/services/press/types";

export function usePressSettings() {
  // Genres
  const [genres, setGenres] = useState<PressGenreType[]>([]);
  const [loadingGenres, setLoadingGenres] = useState<boolean>(false);
  
  // Sections
  const [sections, setSections] = useState<PressSectionType[]>([]);
  const [loadingSections, setLoadingSections] = useState<boolean>(false);
  
  // Sources
  const [sources, setSources] = useState<PressSourceType[]>([]);
  const [loadingSources, setLoadingSources] = useState<boolean>(false);
  
  // Rates
  const [rates, setRates] = useState<PressRateType[]>([]);
  const [loadingRates, setLoadingRates] = useState<boolean>(false);

  // Fetch genres
  const loadGenres = useCallback(async () => {
    setLoadingGenres(true);
    try {
      const data = await fetchPressGenres();
      setGenres(data);
    } catch (error) {
      console.error("Error loading genres:", error);
      toast.error("Error al cargar los géneros");
    } finally {
      setLoadingGenres(false);
    }
  }, []);

  // Fetch sections
  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const data = await fetchPressSections();
      setSections(data);
    } catch (error) {
      console.error("Error loading sections:", error);
      toast.error("Error al cargar las secciones");
    } finally {
      setLoadingSections(false);
    }
  }, []);

  // Fetch sources
  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const data = await fetchPressSources();
      setSources(data);
    } catch (error) {
      console.error("Error loading sources:", error);
      toast.error("Error al cargar las fuentes");
    } finally {
      setLoadingSources(false);
    }
  }, []);

  // Fetch rates
  const loadRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const data = await fetchPressRates();
      setRates(data);
    } catch (error) {
      console.error("Error loading rates:", error);
      toast.error("Error al cargar las tarifas");
    } finally {
      setLoadingRates(false);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    loadGenres();
    loadSections();
    loadSources();
    loadRates();
  }, [loadGenres, loadSections, loadSources, loadRates]);

  // Genres CRUD handlers
  const addGenre = async (name: string): Promise<boolean> => {
    try {
      await createPressGenre({ name });
      toast.success("Género creado exitosamente");
      loadGenres();
      return true;
    } catch (error) {
      console.error("Error adding genre:", error);
      toast.error("Error al crear el género");
      return false;
    }
  };

  const updateGenre = async (id: string, name: string): Promise<boolean> => {
    try {
      await updatePressGenre({ id, name });
      toast.success("Género actualizado exitosamente");
      loadGenres();
      return true;
    } catch (error) {
      console.error("Error updating genre:", error);
      toast.error("Error al actualizar el género");
      return false;
    }
  };

  const removeGenre = async (id: string): Promise<boolean> => {
    try {
      await deletePressGenre(id);
      toast.success("Género eliminado exitosamente");
      loadGenres();
      return true;
    } catch (error) {
      console.error("Error removing genre:", error);
      toast.error("Error al eliminar el género");
      return false;
    }
  };

  // Sections CRUD handlers
  const addSection = async (name: string): Promise<boolean> => {
    try {
      await createPressSection({ name });
      toast.success("Sección creada exitosamente");
      loadSections();
      return true;
    } catch (error) {
      console.error("Error adding section:", error);
      toast.error("Error al crear la sección");
      return false;
    }
  };

  const updateSection = async (id: string, name: string): Promise<boolean> => {
    try {
      await updatePressSection({ id, name });
      toast.success("Sección actualizada exitosamente");
      loadSections();
      return true;
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error("Error al actualizar la sección");
      return false;
    }
  };

  const removeSection = async (id: string): Promise<boolean> => {
    try {
      await deletePressSection(id);
      toast.success("Sección eliminada exitosamente");
      loadSections();
      return true;
    } catch (error) {
      console.error("Error removing section:", error);
      toast.error("Error al eliminar la sección");
      return false;
    }
  };

  // Sources CRUD handlers
  const addSource = async (name: string): Promise<boolean> => {
    try {
      await createPressSource({ name });
      toast.success("Fuente creada exitosamente");
      loadSources();
      return true;
    } catch (error) {
      console.error("Error adding source:", error);
      toast.error("Error al crear la fuente");
      return false;
    }
  };

  const updateSource = async (id: string, name: string): Promise<boolean> => {
    try {
      await updatePressSource({ id, name });
      toast.success("Fuente actualizada exitosamente");
      loadSources();
      return true;
    } catch (error) {
      console.error("Error updating source:", error);
      toast.error("Error al actualizar la fuente");
      return false;
    }
  };

  const removeSource = async (id: string): Promise<boolean> => {
    try {
      await deletePressSource(id);
      toast.success("Fuente eliminada exitosamente");
      loadSources();
      return true;
    } catch (error) {
      console.error("Error removing source:", error);
      toast.error("Error al eliminar la fuente");
      return false;
    }
  };

  // Rates CRUD handlers
  const addRate = async (name: string): Promise<boolean> => {
    try {
      await createPressRate({ name });
      toast.success("Tarifa creada exitosamente");
      loadRates();
      return true;
    } catch (error) {
      console.error("Error adding rate:", error);
      toast.error("Error al crear la tarifa");
      return false;
    }
  };

  const updateRate = async (id: string, name: string): Promise<boolean> => {
    try {
      await updatePressRate({ id, name });
      toast.success("Tarifa actualizada exitosamente");
      loadRates();
      return true;
    } catch (error) {
      console.error("Error updating rate:", error);
      toast.error("Error al actualizar la tarifa");
      return false;
    }
  };

  const removeRate = async (id: string): Promise<boolean> => {
    try {
      await deletePressRate(id);
      toast.success("Tarifa eliminada exitosamente");
      loadRates();
      return true;
    } catch (error) {
      console.error("Error removing rate:", error);
      toast.error("Error al eliminar la tarifa");
      return false;
    }
  };

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
