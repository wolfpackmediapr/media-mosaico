
import { supabase } from "@/integrations/supabase/client";
import { RadioRateType, StationType, ProgramType } from "./types";
import { fetchStations } from "./stationService";
import { fetchPrograms, createProgram } from "./programService";
import { toast } from "sonner";

// This interface defines the expected structure of imported rate data
export interface ImportedRateData {
  station_name: string;
  program_name: string;
  days: string[];
  start_time: string;
  end_time: string;
  rate_15s?: number | null;
  rate_30s?: number | null;
  rate_45s?: number | null;
  rate_60s?: number | null;
}

// Process a CSV file and return parsed rate data
export async function parseRatesCSV(file: File): Promise<ImportedRateData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate the CSV has required columns
        const requiredColumns = ['station_name', 'program_name', 'days', 'start_time', 'end_time'];
        for (const col of requiredColumns) {
          if (!headers.includes(col)) {
            reject(new Error(`CSV missing required column: ${col}`));
            return;
          }
        }
        
        const rates: ImportedRateData[] = [];
        
        // Parse each line (skip header)
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Skip empty lines
          
          const values = lines[i].split(',').map(v => v.trim());
          const rate: any = {};
          
          // Map CSV values to rate object
          headers.forEach((header, index) => {
            if (header === 'days') {
              // Parse days as array
              rate[header] = values[index].split(';').map(d => d.trim());
            } else if (['rate_15s', 'rate_30s', 'rate_45s', 'rate_60s'].includes(header)) {
              // Parse rate values as numbers
              const val = parseFloat(values[index]);
              rate[header] = isNaN(val) ? null : val;
            } else {
              rate[header] = values[index];
            }
          });
          
          rates.push(rate as ImportedRateData);
        }
        
        resolve(rates);
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

// Find or create programs for all imported rates
async function ensurePrograms(
  importedRates: ImportedRateData[],
  stationMap: Map<string, string>,
  existingPrograms: ProgramType[]
): Promise<Map<string, string>> {
  // Create a map to store program name+station -> program ID
  const programMap = new Map<string, string>();
  
  // First map all existing programs
  for (const program of existingPrograms) {
    const stationId = program.station_id;
    const key = `${program.name}|${stationId}`;
    programMap.set(key, program.id!);
  }
  
  // Find all programs that need to be created
  const programsToCreate: Omit<ProgramType, 'id' | 'created_at'>[] = [];
  
  for (const rate of importedRates) {
    const stationId = stationMap.get(rate.station_name);
    if (!stationId) continue; // Skip if station not found
    
    const key = `${rate.program_name}|${stationId}`;
    
    // If program doesn't exist, add it to creation list
    if (!programMap.has(key)) {
      programsToCreate.push({
        name: rate.program_name,
        station_id: stationId,
        days: rate.days,
        start_time: rate.start_time,
        end_time: rate.end_time
      });
      
      // Add to map to avoid creating duplicates
      programMap.set(key, `pending_${key}`);
    }
  }
  
  // Create new programs and update map with real IDs
  for (const programData of programsToCreate) {
    try {
      const newProgram = await createProgram(programData);
      const key = `${newProgram.name}|${newProgram.station_id}`;
      programMap.set(key, newProgram.id!);
    } catch (error) {
      console.error("Error creating program:", error);
    }
  }
  
  return programMap;
}

// Main import function that processes data and creates rates
export async function importRates(importedRates: ImportedRateType[]): Promise<{
  success: boolean;
  imported: number;
  errors: number;
  message: string;
}> {
  try {
    console.log("Starting import process for", importedRates.length, "rates");
    
    // Fetch all stations and create name -> id map
    const stations = await fetchStations();
    const stationMap = new Map<string, string>();
    stations.forEach(station => stationMap.set(station.name, station.id));
    
    // Fetch all programs 
    const programs = await fetchPrograms();
    
    // Ensure all needed programs exist
    const programMap = await ensurePrograms(importedRates, stationMap, programs);
    
    // Prepare rates for import
    const ratesToCreate: Omit<RadioRateType, 'id' | 'created_at' | 'station_name' | 'program_name'>[] = [];
    const errors: ImportedRateData[] = [];
    
    for (const rate of importedRates) {
      const stationId = stationMap.get(rate.station_name);
      if (!stationId) {
        errors.push(rate);
        continue;
      }
      
      const programKey = `${rate.program_name}|${stationId}`;
      const programId = programMap.get(programKey);
      if (!programId || programId.startsWith('pending_')) {
        errors.push(rate);
        continue;
      }
      
      ratesToCreate.push({
        station_id: stationId,
        program_id: programId,
        days: rate.days,
        start_time: rate.start_time,
        end_time: rate.end_time,
        rate_15s: rate.rate_15s,
        rate_30s: rate.rate_30s,
        rate_45s: rate.rate_45s,
        rate_60s: rate.rate_60s
      });
    }
    
    // Insert rates in batches for better performance
    let inserted = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < ratesToCreate.length; i += BATCH_SIZE) {
      const batch = ratesToCreate.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('radio_rates')
        .insert(batch)
        .select();
      
      if (error) {
        console.error("Error inserting rates batch:", error);
        errors.push(...importedRates.slice(i, i + BATCH_SIZE));
      } else {
        inserted += data?.length || 0;
      }
    }
    
    const successMessage = `Imported ${inserted} rates successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`;
    
    return {
      success: inserted > 0,
      imported: inserted,
      errors: errors.length,
      message: successMessage
    };
  } catch (error) {
    console.error("Error importing rates:", error);
    return {
      success: false,
      imported: 0,
      errors: importedRates.length,
      message: `Import failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Type for the rate data being imported
export type ImportedRateType = ImportedRateData;
