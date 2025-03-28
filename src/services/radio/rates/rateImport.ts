
import { supabase } from "@/integrations/supabase/client";
import { RadioRateType } from "../types";
import { fetchStations } from "../stationService";
import { fetchPrograms } from "../programService";
import { createRate } from "./rateCommands";

// Function to import a CSV of rates
export const importRatesFromCsv = async (
  csvText: string,
  delimiter: string = ','
): Promise<{ success: boolean; imported: number; errors: any[] }> => {
  const results = {
    success: false,
    imported: 0,
    errors: [] as any[],
  };

  try {
    // Parse CSV
    const lines = csvText.split('\n');
    if (lines.length <= 1) {
      throw new Error('CSV file is empty or has only headers');
    }

    // Get the headers
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    // Required columns
    const requiredColumns = ['station', 'program', 'days', 'start_time', 'end_time'];
    const rateColumns = ['rate_15s', 'rate_30s', 'rate_45s', 'rate_60s'];
    
    // Check if all required columns exist
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Need at least one rate column
    const hasRateColumn = rateColumns.some(col => headers.includes(col));
    if (!hasRateColumn) {
      throw new Error('CSV must include at least one rate column (rate_15s, rate_30s, rate_45s, rate_60s)');
    }
    
    // Get index of each column
    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      columnIndices[header] = index;
    });
    
    // Fetch all stations and programs to match by name
    const stations = await fetchStations();
    const programs = await fetchPrograms();
    
    // Station and program lookups by name
    const stationsByName = new Map(stations.map(s => [s.name.toLowerCase(), s]));
    const programsByName = new Map(programs.map(p => [p.name.toLowerCase(), p]));
    
    // Process each line (skip header)
    const ratesToImport: Omit<RadioRateType, 'id' | 'created_at' | 'station_name' | 'program_name'>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      try {
        const values = line.split(delimiter).map(v => v.trim());
        
        // Get values from the row
        const stationName = values[columnIndices.station];
        const programName = values[columnIndices.program];
        const daysString = values[columnIndices.days];
        const startTime = values[columnIndices.start_time];
        const endTime = values[columnIndices.end_time];
        
        // Validate required fields
        if (!stationName || !programName || !daysString || !startTime || !endTime) {
          results.errors.push({
            line: i + 1,
            error: 'Missing required fields',
            data: line
          });
          continue;
        }
        
        // Find or reject station and program
        const station = stationsByName.get(stationName.toLowerCase());
        if (!station) {
          results.errors.push({
            line: i + 1,
            error: `Station not found: ${stationName}`,
            data: line
          });
          continue;
        }
        
        const program = programsByName.get(programName.toLowerCase());
        if (!program) {
          results.errors.push({
            line: i + 1, 
            error: `Program not found: ${programName}`,
            data: line
          });
          continue;
        }
        
        // Parse days
        const days = daysString.split(',').map(d => d.trim());
        
        // Parse rates
        const rate_15s = columnIndices.rate_15s !== undefined ? 
          parseFloatOrNull(values[columnIndices.rate_15s]) : null;
        const rate_30s = columnIndices.rate_30s !== undefined ? 
          parseFloatOrNull(values[columnIndices.rate_30s]) : null;
        const rate_45s = columnIndices.rate_45s !== undefined ? 
          parseFloatOrNull(values[columnIndices.rate_45s]) : null;
        const rate_60s = columnIndices.rate_60s !== undefined ? 
          parseFloatOrNull(values[columnIndices.rate_60s]) : null;
        
        // Create rate object
        const rateData = {
          station_id: station.id,
          program_id: program.id!,
          days,
          start_time: startTime,
          end_time: endTime,
          rate_15s,
          rate_30s,
          rate_45s,
          rate_60s
        };
        
        ratesToImport.push(rateData);
      } catch (error) {
        results.errors.push({
          line: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: line
        });
      }
    }
    
    // Import all rates
    if (ratesToImport.length > 0) {
      for (const rateData of ratesToImport) {
        try {
          await createRate(rateData);
          results.imported++;
        } catch (error) {
          results.errors.push({
            error: error instanceof Error ? error.message : 'Unknown error',
            data: rateData
          });
        }
      }
    }
    
    results.success = results.imported > 0;
    return results;
  } catch (error) {
    console.error("Error importing rates from CSV:", error);
    results.errors.push({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return results;
  }
};

// Helper function to parse float or return null
const parseFloatOrNull = (value: string): number | null => {
  if (!value || value === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};
