
import { supabase } from "@/integrations/supabase/client";
import { StationType, ProgramType } from "../types";
import { defaultRadioStationsData, wkaqPrograms, radioIslaPrograms, notiUnoPrograms } from "./defaultRadioData";
import { getDataVersion } from "../utils";
import { saveStoredRadioPrograms } from "../utils";

/**
 * Check if radio stations/programs need to be seeded
 */
export async function shouldSeedRadioData(forceRefresh = false): Promise<{
  shouldSeedStations: boolean; 
  shouldSeedPrograms: boolean;
}> {
  // If forcing a refresh, seed everything
  if (forceRefresh) {
    return { shouldSeedStations: true, shouldSeedPrograms: true };
  }
  
  try {
    // Check for existing stations
    const { count: stationCount, error: stationError } = await supabase
      .from('media_outlets')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'radio');
    
    const hasStations = !stationError && stationCount !== null && stationCount > 0;
    
    // Check for existing programs
    const { count: programCount, error: programError } = await supabase
      .from('radio_programs')
      .select('*', { count: 'exact', head: true });
    
    const hasPrograms = !programError && programCount !== null && programCount > 0;
    
    // Check localStorage for programs
    const localPrograms = localStorage.getItem('radio_programs');
    const hasLocalPrograms = localPrograms && localPrograms !== '[]';
    
    // We need to seed stations if we have none
    const shouldSeedStations = !hasStations;
    
    // We need to seed programs if we have stations but no programs (in DB or localStorage)
    const shouldSeedPrograms = hasStations && !hasPrograms && !hasLocalPrograms;
    
    return { shouldSeedStations, shouldSeedPrograms };
  } catch (error) {
    console.error('Error checking if radio data needs seeding:', error);
    return { shouldSeedStations: false, shouldSeedPrograms: false };
  }
}

/**
 * Create radio stations in the database
 */
export async function createStations(): Promise<Record<string, string>> {
  // Map to store station names to IDs
  const stationMap: Record<string, string> = {};
  
  try {
    // Insert stations and get their IDs
    for (const station of defaultRadioStationsData) {
      const { data, error } = await supabase
        .from('media_outlets')
        .insert({
          name: station.name,
          code: station.code,
          type: 'radio'
        })
        .select('id, name')
        .single();
      
      if (error) throw error;
      
      if (data) {
        stationMap[data.name] = data.id;
      }
    }
    
    return stationMap;
  } catch (error) {
    console.error('Error creating radio stations:', error);
    throw error;
  }
}

/**
 * Fetch existing stations and their IDs
 */
export async function fetchExistingStations(): Promise<Record<string, string>> {
  const stationMap: Record<string, string> = {};
  
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .select('id, name')
      .eq('type', 'radio');
    
    if (error) throw error;
    
    if (data) {
      data.forEach(station => {
        stationMap[station.name] = station.id;
      });
    }
    
    return stationMap;
  } catch (error) {
    console.error('Error fetching existing radio stations:', error);
    throw error;
  }
}

/**
 * Create radio programs data with correct station IDs
 */
export function createProgramsData(stationMap: Record<string, string>): ProgramType[] {
  const allPrograms: ProgramType[] = [];
  
  // Add WKAQ programs
  if (stationMap['WKAQ']) {
    const wkaqId = stationMap['WKAQ'];
    wkaqPrograms.forEach(program => {
      allPrograms.push({
        ...program,
        station_id: wkaqId
      });
    });
  }
  
  // Add Radio Isla programs
  if (stationMap['Radio Isla']) {
    const radioIslaId = stationMap['Radio Isla'];
    radioIslaPrograms.forEach(program => {
      allPrograms.push({
        ...program,
        station_id: radioIslaId
      });
    });
  }
  
  // Add NotiUno programs
  if (stationMap['NotiUno']) {
    const notiUnoId = stationMap['NotiUno'];
    notiUnoPrograms.forEach(program => {
      allPrograms.push({
        ...program,
        station_id: notiUnoId
      });
    });
  }
  
  return allPrograms;
}
