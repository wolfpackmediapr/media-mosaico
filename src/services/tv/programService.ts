
import { supabase } from "@/integrations/supabase/client";
import { ProgramType } from "./types";
import { 
  ensureTablesExist, 
  getStoredPrograms, 
  saveStoredPrograms, 
  isUsingDatabase,
  getProgramsFromDatabase,
  saveProgramsToDatabase
} from "./utils";

// Program Services - We'll use either database or localStorage depending on migration status
export async function fetchPrograms(): Promise<ProgramType[]> {
  try {
    // Check if we need to create the table first
    await ensureTablesExist();
    
    // Check if we're using database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    if (usingDatabase) {
      // Get from database
      return getProgramsFromDatabase();
    } else {
      // Get from localStorage (legacy)
      return getStoredPrograms();
    }
  } catch (error) {
    console.error('Error fetching programs:', error);
    return []; // Return empty array for now
  }
}

export async function createProgram(program: Omit<ProgramType, 'id'>): Promise<ProgramType> {
  try {
    // Check if we're using database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    if (usingDatabase) {
      // Store in database
      const { data, error } = await supabase
        .from('tv_programs')
        .insert([{
          name: program.name,
          channel_id: program.channel_id,
          start_time: program.start_time,
          end_time: program.end_time,
          days: program.days
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as ProgramType;
    } else {
      // Store in local storage as a temporary solution (legacy)
      const storedPrograms = getStoredPrograms();
      const newProgram = {
        ...program,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      saveStoredPrograms([...storedPrograms, newProgram]);
      
      return newProgram;
    }
  } catch (error) {
    console.error('Error creating program:', error);
    throw error;
  }
}

export async function updateProgram(program: ProgramType): Promise<void> {
  try {
    // Check if we're using database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    if (usingDatabase) {
      // Update in database
      const { error } = await supabase
        .from('tv_programs')
        .update({
          name: program.name,
          channel_id: program.channel_id,
          start_time: program.start_time,
          end_time: program.end_time,
          days: program.days
        })
        .eq('id', program.id);
      
      if (error) throw error;
    } else {
      // Update in local storage as a temporary solution (legacy)
      const storedPrograms = getStoredPrograms();
      const updatedPrograms = storedPrograms.map((p: ProgramType) => 
        p.id === program.id ? program : p
      );
      saveStoredPrograms(updatedPrograms);
    }
  } catch (error) {
    console.error('Error updating program:', error);
    throw error;
  }
}

export async function deleteProgram(id: string): Promise<void> {
  try {
    // Check if we're using database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    if (usingDatabase) {
      // Delete from database
      const { error } = await supabase
        .from('tv_programs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } else {
      // Delete from local storage as a temporary solution (legacy)
      const storedPrograms = getStoredPrograms();
      const filteredPrograms = storedPrograms.filter((p: ProgramType) => p.id !== id);
      saveStoredPrograms(filteredPrograms);
    }
  } catch (error) {
    console.error('Error deleting program:', error);
    throw error;
  }
}
