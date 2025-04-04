
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Source, Genre } from "@/pages/configuracion/press/types/press-types";
import { MediaOutlet } from "@/services/media/mediaService";
import { ParticipantType, ParticipantCategoryType } from "@/services/participantes/types";

/**
 * Fetches media sources from the press configuration
 * @returns List of media sources
 */
export async function fetchMediaSources(): Promise<Source[]> {
  try {
    // In a real implementation, this would fetch from the "medios" table
    // For example:
    // const { data, error } = await supabase
    //   .from("press_media_sources")
    //   .select("*");

    // For now, using the imported data from the press configuration settings
    const { data: genres, error } = await supabase
      .from("press_genres")
      .select("*");
    
    if (error) {
      console.error("Error fetching media sources:", error);
      throw new Error(error.message);
    }

    // If we have real data, return it
    if (genres) {
      return genres.map(genre => ({
        id: genre.id,
        name: genre.name
      }));
    }

    // Fallback to imported mock data if the table doesn't exist yet
    // In a production app, we'd ensure the table exists
    const { getInitialSources } = await import("@/pages/configuracion/press/components/initialSources");
    return getInitialSources();
  } catch (error) {
    console.error("Error fetching media sources:", error);
    throw error;
  }
}

/**
 * Fetches press genres from the configuration
 * @returns List of genres
 */
export async function fetchGenres(): Promise<Genre[]> {
  try {
    const { data, error } = await supabase
      .from("press_genres")
      .select("*");
    
    if (error) {
      console.error("Error fetching genres:", error);
      throw new Error(error.message);
    }

    // If we have real data, return it
    if (data && data.length > 0) {
      return data.map(genre => ({
        id: genre.id,
        name: genre.name
      }));
    }

    // Fallback to imported mock data
    const { getInitialGenres } = await import("@/pages/configuracion/press/components/initialGenres");
    return getInitialGenres();
  } catch (error) {
    console.error("Error fetching genres:", error);
    throw error;
  }
}

/**
 * Fetches institutions from the configuration
 * @returns List of institutions
 */
export async function fetchInstitutions(): Promise<Array<{id: string, name: string}>> {
  try {
    // In a real setup, this would be the institutions table
    const { data, error } = await supabase
      .from("institutions")
      .select("id, name");
    
    if (error) {
      console.error("Error fetching institutions:", error);
      throw new Error(error.message);
    }

    // If we have data, return it
    if (data && data.length > 0) {
      return data;
    }

    // Fallback to mock data
    return [
      { id: "1", name: "Gobierno de Puerto Rico" },
      { id: "2", name: "Universidad de Puerto Rico" },
      { id: "3", name: "Departamento de Salud" },
      { id: "4", name: "Fondo Monetario Internacional" },
      { id: "5", name: "Banco Popular" }
    ];
  } catch (error) {
    console.error("Error fetching institutions:", error);
    throw error;
  }
}

/**
 * Fetches institution categories from the configuration
 * @returns List of institution categories
 */
export async function fetchInstitutionCategories(): Promise<Array<{id: string, name: string}>> {
  try {
    // In a real setup, this would be the institution categories table
    const { data, error } = await supabase
      .from("institution_categories")
      .select("id, name");
    
    if (error) {
      console.error("Error fetching institution categories:", error);
      throw new Error(error.message);
    }

    // If we have data, return it
    if (data && data.length > 0) {
      return data;
    }

    // Fallback to mock data
    return [
      { id: "1", name: "Gobierno" },
      { id: "2", name: "Educación" },
      { id: "3", name: "Salud" },
      { id: "4", name: "Finanzas" },
      { id: "5", name: "Bancos" },
      { id: "6", name: "Aseguradoras" },
      { id: "7", name: "Organizaciones Sin Fines de Lucro" }
    ];
  } catch (error) {
    console.error("Error fetching institution categories:", error);
    throw error;
  }
}

/**
 * Fetches participants from the configuration
 * @returns List of participants
 */
export async function fetchParticipants(): Promise<Array<{id: string, name: string}>> {
  try {
    // In a real setup, this would be the participants table
    const { data, error } = await supabase
      .from("participants")
      .select("id, name");
    
    if (error) {
      console.error("Error fetching participants:", error);
      throw new Error(error.message);
    }

    // If we have data, return it
    if (data && data.length > 0) {
      return data;
    }

    // Fallback to mock data
    return [
      { id: "1", name: "Juan Pérez" },
      { id: "2", name: "María Rodríguez" },
      { id: "3", name: "Carlos Sánchez" },
      { id: "4", name: "Ana González" },
      { id: "5", name: "Pedro Martínez" }
    ];
  } catch (error) {
    console.error("Error fetching participants:", error);
    throw error;
  }
}
