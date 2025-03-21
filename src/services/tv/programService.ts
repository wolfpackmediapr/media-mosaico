
import { ProgramType } from "./types";
import { ensureTablesExist, getStoredPrograms, saveStoredPrograms } from "./utils";

// Program Services - We'll use localStorage for these
export async function fetchPrograms(): Promise<ProgramType[]> {
  try {
    // Check if we need to create the table first
    await ensureTablesExist();
    
    // Get from localStorage
    return getStoredPrograms();
  } catch (error) {
    console.error('Error fetching programs:', error);
    return []; // Return empty array for now
  }
}

export async function createProgram(program: Omit<ProgramType, 'id'>): Promise<ProgramType> {
  try {
    // Store in local storage as a temporary solution
    const storedPrograms = getStoredPrograms();
    const newProgram = {
      ...program,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    saveStoredPrograms([...storedPrograms, newProgram]);
    
    return newProgram;
  } catch (error) {
    console.error('Error creating program:', error);
    throw error;
  }
}

export async function updateProgram(program: ProgramType): Promise<void> {
  try {
    // Update in local storage as a temporary solution
    const storedPrograms = getStoredPrograms();
    const updatedPrograms = storedPrograms.map((p: ProgramType) => 
      p.id === program.id ? program : p
    );
    saveStoredPrograms(updatedPrograms);
  } catch (error) {
    console.error('Error updating program:', error);
    throw error;
  }
}

export async function deleteProgram(id: string): Promise<void> {
  try {
    // Delete from local storage as a temporary solution
    const storedPrograms = getStoredPrograms();
    const filteredPrograms = storedPrograms.filter((p: ProgramType) => p.id !== id);
    saveStoredPrograms(filteredPrograms);
  } catch (error) {
    console.error('Error deleting program:', error);
    throw error;
  }
}
