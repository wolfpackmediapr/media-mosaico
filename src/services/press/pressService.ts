
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Source, Genre } from "@/pages/configuracion/press/types/press-types";
import { MediaOutlet } from "@/services/media/mediaService";
import { ParticipantType, ParticipantCategoryType } from "@/services/participantes/types";

/**
 * Fetches media sources from the media_outlets table
 * @returns List of media sources
 */
export async function fetchMediaSources(): Promise<Source[]> {
  try {
    // Fetch from media_outlets table with type filter for press
    const { data, error } = await supabase
      .from("media_outlets")
      .select("id, name")
      .eq("type", "press");
    
    if (error) {
      console.error("Error fetching media sources:", error);
      throw new Error(error.message);
    }

    // Return data if it exists and has entries
    if (data && data.length > 0) {
      return data.map(source => ({
        id: String(source.id), // Ensure id is string
        name: source.name
      }));
    }

    // Fallback to imported mock data if the table doesn't have data
    const { getInitialSources } = await import("@/pages/configuracion/press/components/initialSources");
    return getInitialSources();
  } catch (error) {
    console.error("Error fetching media sources:", error);
    throw error;
  }
}

/**
 * Fetches press genres - uses the feed_sources table as a fallback
 * @returns List of genres
 */
export async function fetchGenres(): Promise<Genre[]> {
  try {
    // Try to use feed_sources with a filter for genre types
    const { data, error } = await supabase
      .from("feed_sources")
      .select("id, name")
      .eq("platform", "genre");
    
    if (error) {
      console.error("Error fetching genres:", error);
      throw new Error(error.message);
    }

    // If we have data, return it
    if (data && data.length > 0) {
      return data.map(genre => ({
        id: String(genre.id), // Ensure id is string
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
 * Fetches institutions from the clients table (institutions are clients in this context)
 * @returns List of institutions
 */
export async function fetchInstitutions(): Promise<Array<{id: string, name: string}>> {
  try {
    // Use the clients table as institutions
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .eq("category", "institution");
    
    if (error) {
      console.error("Error fetching institutions:", error);
      throw new Error(error.message);
    }

    // If we have data, return it
    if (data && data.length > 0) {
      return data.map(institution => ({
        id: String(institution.id), // Ensure id is string
        name: institution.name
      }));
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
 * Fetches institution categories from the clients table with a groupBy category
 * @returns List of institution categories
 */
export async function fetchInstitutionCategories(): Promise<Array<{id: string, name: string}>> {
  try {
    // In a real setup, we'd use a dedicated table. Here, we'll extract unique categories
    // from the clients table and format them into the expected shape
    const { data, error } = await supabase
      .from("clients")
      .select("category");
    
    if (error) {
      console.error("Error fetching institution categories:", error);
      throw new Error(error.message);
    }

    // If we have data, transform it to the expected format
    if (data && data.length > 0) {
      // Get unique categories
      const uniqueCategories = [...new Set(data.map(client => client.category))].filter(Boolean);
      
      // Transform to required format
      return uniqueCategories.map((category, index) => ({
        id: String(index + 1),
        name: category
      }));
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
 * Fetches participants from the profiles table
 * @returns List of participants
 */
export async function fetchParticipants(): Promise<Array<{id: string, name: string}>> {
  try {
    // Use the profiles table for participants
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username");
    
    if (error) {
      console.error("Error fetching participants:", error);
      throw new Error(error.message);
    }

    // If we have data, return it
    if (data && data.length > 0) {
      return data.map(profile => ({
        id: String(profile.id), // Ensure id is string
        name: profile.username || 'Unknown User'
      }));
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
