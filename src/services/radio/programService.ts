
import { supabase } from "@/integrations/supabase/client";
import { ProgramType } from "./types";

/**
 * Fetch all radio programs from the database
 */
export async function fetchPrograms(): Promise<ProgramType[]> {
  try {
    console.log("Fetching radio programs from database...");
    const { data, error } = await supabase
      .from('radio_programs')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching radio programs:', error);
      throw error;
    }
    
    console.log("Radio programs data:", data);
    return data as ProgramType[];
  } catch (error) {
    console.error('Error fetching radio programs:', error);
    return [];
  }
}

/**
 * Get programs for a specific station
 */
export async function getProgramsByStation(stationId: string): Promise<ProgramType[]> {
  try {
    const { data, error } = await supabase
      .from('radio_programs')
      .select('*')
      .eq('station_id', stationId)
      .order('name');
    
    if (error) throw error;
    
    return data as ProgramType[];
  } catch (error) {
    console.error('Error fetching programs by station:', error);
    return [];
  }
}

/**
 * Create a new radio program
 */
export async function createProgram(programData: Omit<ProgramType, 'id' | 'created_at'>): Promise<ProgramType> {
  try {
    const { data, error } = await supabase
      .from('radio_programs')
      .insert(programData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as ProgramType;
  } catch (error) {
    console.error('Error creating radio program:', error);
    throw error;
  }
}

/**
 * Update an existing radio program
 */
export async function updateProgram(programData: ProgramType): Promise<ProgramType> {
  try {
    const { id, created_at, ...updateData } = programData;
    
    const { data, error } = await supabase
      .from('radio_programs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as ProgramType;
  } catch (error) {
    console.error('Error updating radio program:', error);
    throw error;
  }
}

/**
 * Delete a radio program
 */
export async function deleteProgram(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('radio_programs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting radio program:', error);
    throw error;
  }
}
