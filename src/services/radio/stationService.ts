
import { supabase } from "@/integrations/supabase/client";
import { StationType } from "./types";
import { toast } from "sonner";

/**
 * Fetch all radio stations from the database
 */
export async function fetchStations(): Promise<StationType[]> {
  try {
    console.log("Fetching radio stations from database...");
    const { data, error } = await supabase
      .from('media_outlets')
      .select('id, name, folder')
      .eq('type', 'radio')
      .order('name');
    
    if (error) {
      console.error('Error fetching radio stations:', error);
      throw error;
    }
    
    console.log("Raw stations data:", data);
    
    // Convert the data to StationType format using the folder field as code
    const formattedStations = data.map(station => ({
      id: station.id,
      name: station.name,
      code: station.folder || station.name.substring(0, 4).toUpperCase() // Use folder as code or fallback to first 4 chars
    })) as StationType[];
    
    console.log("Formatted stations:", formattedStations);
    return formattedStations;
  } catch (error) {
    console.error('Error fetching radio stations:', error);
    return [];
  }
}

/**
 * Get a single station by ID
 */
export async function getStation(id: string): Promise<StationType | null> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .select('id, name, folder')
      .eq('id', id)
      .eq('type', 'radio')
      .single();
    
    if (error) throw error;
    
    // Convert to StationType
    return {
      id: data.id,
      name: data.name,
      code: data.folder || data.name.substring(0, 4).toUpperCase() // Use folder as code or fallback
    };
  } catch (error) {
    console.error('Error getting radio station:', error);
    return null;
  }
}

/**
 * Create a new radio station
 */
export async function createStation(stationData: Omit<StationType, 'id'>): Promise<StationType> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .insert({
        name: stationData.name,
        folder: stationData.code, // Store code in the folder field
        type: 'radio'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert to StationType
    return {
      id: data.id,
      name: data.name,
      code: data.folder || stationData.code // Use the original code as fallback
    };
  } catch (error) {
    console.error('Error creating radio station:', error);
    throw error;
  }
}

/**
 * Update an existing radio station
 */
export async function updateStation(stationData: StationType): Promise<StationType> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .update({
        name: stationData.name,
        folder: stationData.code // Store code in the folder field
      })
      .eq('id', stationData.id)
      .eq('type', 'radio')
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert to StationType
    return {
      id: data.id,
      name: data.name,
      code: data.folder || stationData.code // Use the original code as fallback
    };
  } catch (error) {
    console.error('Error updating radio station:', error);
    throw error;
  }
}

/**
 * Delete a radio station and its associated programs
 */
export async function deleteStation(id: string): Promise<void> {
  try {
    // First delete programs associated with the station (due to foreign key constraints)
    const { error: programsError } = await supabase
      .from('radio_programs')
      .delete()
      .eq('station_id', id);
    
    if (programsError) throw programsError;
    
    // Then delete the station
    const { error: stationError } = await supabase
      .from('media_outlets')
      .delete()
      .eq('id', id)
      .eq('type', 'radio');
    
    if (stationError) throw stationError;
  } catch (error) {
    console.error('Error deleting radio station:', error);
    throw error;
  }
}
