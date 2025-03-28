
import { supabase } from "@/integrations/supabase/client";
import { StationType } from "./types";
import { toast } from "sonner";

/**
 * Fetch all radio stations from the database
 */
export async function fetchStations(): Promise<StationType[]> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .select('id, name, code')
      .eq('type', 'radio')
      .order('name');
    
    if (error) throw error;
    
    return data as StationType[];
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
      .select('id, name, code')
      .eq('id', id)
      .eq('type', 'radio')
      .single();
    
    if (error) throw error;
    
    return data as StationType;
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
        code: stationData.code,
        type: 'radio'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data as StationType;
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
        code: stationData.code
      })
      .eq('id', stationData.id)
      .eq('type', 'radio')
      .select()
      .single();
    
    if (error) throw error;
    
    return data as StationType;
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
