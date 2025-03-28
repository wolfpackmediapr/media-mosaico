
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from 'papaparse';
import { TvRateType } from "../types";
import { uuid } from "@/lib/utils";

interface CSVRow {
  channel_id?: string;
  program_id?: string;
  medio?: string;
  programa?: string;
  days?: string;
  l?: string;
  k?: string;
  m?: string;
  j?: string;
  v?: string;
  s?: string;
  d?: string;
  start_time?: string;
  end_time?: string;
  hora_ini?: string;
  hora_fin?: string;
  rate_15s?: string;
  rate_30s?: string;
  rate_45s?: string;
  rate_60s?: string;
  "15s"?: string;
  "30s"?: string;
  "45s"?: string;
  "60s"?: string;
}

// Map Spanish day names to English three-letter codes
const mapDayToCode = (day: string): string => {
  const dayMap: Record<string, string> = {
    'lunes': 'Mon',
    'l': 'Mon',
    'martes': 'Tue',
    'k': 'Tue',
    'miércoles': 'Wed',
    'miercoles': 'Wed',
    'm': 'Wed',
    'jueves': 'Thu',
    'j': 'Thu',
    'viernes': 'Fri',
    'v': 'Fri',
    'sábado': 'Sat',
    'sabado': 'Sat',
    's': 'Sat',
    'domingo': 'Sun',
    'd': 'Sun',
    // Already in English format
    'mon': 'Mon',
    'tue': 'Tue',
    'wed': 'Wed',
    'thu': 'Thu',
    'fri': 'Fri',
    'sat': 'Sat',
    'sun': 'Sun',
    // Special cases for Spanish abbreviations
    'si': 'true',
    'no': 'false'
  };
  
  return dayMap[day.toLowerCase()] || day;
};

// Format time string consistently
const formatTimeString = (timeStr: string): string => {
  if (!timeStr) return '';
  
  // Already in the right format
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    return timeStr.substring(0, 5); // Take only HH:MM part
  }
  
  // Parse different formats
  try {
    const cleanedTime = timeStr.replace(/\s+/g, ' ').trim();
    
    if (/^\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)$/.test(cleanedTime)) {
      const [timePart, ampm] = cleanedTime.split(/\s+/);
      const [hours, minutes = '00'] = timePart.split(':');
      
      let hoursNum = parseInt(hours);
      if (ampm.toLowerCase() === 'pm' && hoursNum < 12) hoursNum += 12;
      if (ampm.toLowerCase() === 'am' && hoursNum === 12) hoursNum = 0;
      
      return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
    }
    
    // If just numbers, assume it's hours
    if (/^\d{1,2}$/.test(cleanedTime)) {
      return `${parseInt(cleanedTime).toString().padStart(2, '0')}:00`;
    }
  } catch (e) {
    console.error('Error parsing time:', timeStr, e);
  }
  
  return timeStr; // Return as is if we can't parse it
};

export const importRatesFromCSV = async (file: File): Promise<void> => {
  try {
    return new Promise((resolve, reject) => {
      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            if (results.errors.length > 0) {
              console.error("CSV parsing errors:", results.errors);
              toast.error("Error al analizar el archivo CSV");
              reject(new Error("CSV parsing errors"));
              return;
            }
            
            // Validate CSV structure
            if (results.data.length === 0) {
              toast.error("El archivo CSV está vacío");
              reject(new Error("Empty CSV file"));
              return;
            }
            
            console.log("CSV Headers:", Object.keys(results.data[0]));
            
            // Look for required columns with flexible naming
            const hasChannelColumn = results.data[0].channel_id !== undefined || results.data[0].medio !== undefined;
            const hasProgramColumn = results.data[0].program_id !== undefined || results.data[0].programa !== undefined;
            const hasStartTimeColumn = results.data[0].start_time !== undefined || results.data[0].hora_ini !== undefined;
            const hasEndTimeColumn = results.data[0].end_time !== undefined || results.data[0].hora_fin !== undefined;
            const hasDaysColumns = results.data[0].days !== undefined || 
                                results.data[0].l !== undefined || 
                                results.data[0].k !== undefined || 
                                results.data[0].m !== undefined || 
                                results.data[0].j !== undefined || 
                                results.data[0].v !== undefined || 
                                results.data[0].s !== undefined || 
                                results.data[0].d !== undefined;
            
            // Rate columns could be named in different ways
            const hasRateColumns = results.data[0].rate_15s !== undefined || 
                                results.data[0].rate_30s !== undefined || 
                                results.data[0].rate_45s !== undefined || 
                                results.data[0].rate_60s !== undefined ||
                                results.data[0]["15s"] !== undefined ||
                                results.data[0]["30s"] !== undefined ||
                                results.data[0]["45s"] !== undefined ||
                                results.data[0]["60s"] !== undefined;
            
            if (!hasChannelColumn || !hasProgramColumn || !hasStartTimeColumn || !hasEndTimeColumn || !hasDaysColumns || !hasRateColumns) {
              const missingColumns = [];
              if (!hasChannelColumn) missingColumns.push("canal/medio");
              if (!hasProgramColumn) missingColumns.push("programa");
              if (!hasStartTimeColumn) missingColumns.push("hora inicio");
              if (!hasEndTimeColumn) missingColumns.push("hora fin");
              if (!hasDaysColumns) missingColumns.push("días");
              if (!hasRateColumns) missingColumns.push("tarifas");
              
              toast.error(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
              reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
              return;
            }
            
            // Fetch channels and programs to map names to IDs
            const { data: channelsData, error: channelsError } = await supabase
              .from('media_outlets')
              .select('id, name, folder')
              .eq('type', 'tv');
              
            if (channelsError) {
              console.error("Error fetching channels:", channelsError);
              toast.error("Error al obtener los canales");
              reject(channelsError);
              return;
            }
            
            const { data: programsData, error: programsError } = await supabase
              .from('tv_programs')
              .select('id, name, channel_id');
              
            if (programsError) {
              console.error("Error fetching programs:", programsError);
              toast.error("Error al obtener los programas");
              reject(programsError);
              return;
            }
            
            const channels = channelsData || [];
            const programs = programsData || [];
            
            // Helper to find a channel by name
            const findChannelId = (channelName: string): string | null => {
              const channel = channels.find(c => 
                c.name.toLowerCase() === channelName.toLowerCase() ||
                c.name.toLowerCase().includes(channelName.toLowerCase()) ||
                channelName.toLowerCase().includes(c.name.toLowerCase())
              );
              
              return channel ? channel.id : null;
            };
            
            // Helper to find a program by name and channel
            const findProgramId = (programName: string, channelId: string): string | null => {
              const program = programs.find(p => 
                p.channel_id === channelId && (
                  p.name.toLowerCase() === programName.toLowerCase() ||
                  p.name.toLowerCase().includes(programName.toLowerCase()) ||
                  programName.toLowerCase().includes(p.name.toLowerCase())
                )
              );
              
              return program ? program.id : null;
            };
            
            // Helper to create a program if it doesn't exist
            const createProgram = async (name: string, channelId: string, days: string[], startTime: string, endTime: string): Promise<string> => {
              const { data, error } = await supabase
                .from('tv_programs')
                .insert({
                  name,
                  channel_id: channelId,
                  days,
                  start_time: startTime,
                  end_time: endTime
                })
                .select()
                .single();
                
              if (error) {
                console.error("Error creating program:", error);
                throw error;
              }
              
              // Add to our local cache
              programs.push(data);
              
              return data.id;
            };
            
            // Process each row to create rate entries
            const rates: any[] = [];
            
            for (let i = 0; i < results.data.length; i++) {
              const row = results.data[i];
              
              // Skip rows with no data
              if (!row.medio && !row.channel_id && !row.programa && !row.program_id) {
                continue;
              }
              
              // Skip rows with "No disponible" in rate columns
              const rate30s = (row.rate_30s || row["30s"] || "").toString().trim();
              if (rate30s.toLowerCase() === "no disponible") {
                continue;
              }
              
              // Get channel ID either directly or by name lookup
              let channelId = row.channel_id;
              if (!channelId && row.medio) {
                channelId = findChannelId(row.medio);
                if (!channelId) {
                  console.warn(`Channel not found for row ${i+1}: ${row.medio}`);
                  continue; // Skip this row
                }
              }
              
              // Get program ID either directly or by name lookup
              let programId = row.program_id;
              if (!programId && row.programa && channelId) {
                programId = findProgramId(row.programa, channelId);
                
                // If program doesn't exist, create it
                if (!programId) {
                  try {
                    // Process days first for program creation
                    let days: string[] = [];
                    
                    // Handle explicit days columns (L, K, M, J, V, S, D)
                    if (row.l || row.k || row.m || row.j || row.v || row.s || row.d) {
                      if (row.l?.toLowerCase() === 'si') days.push('Mon');
                      if (row.k?.toLowerCase() === 'si') days.push('Tue');
                      if (row.m?.toLowerCase() === 'si') days.push('Wed');
                      if (row.j?.toLowerCase() === 'si') days.push('Thu');
                      if (row.v?.toLowerCase() === 'si') days.push('Fri');
                      if (row.s?.toLowerCase() === 'si') days.push('Sat');
                      if (row.d?.toLowerCase() === 'si') days.push('Sun');
                    } 
                    // If days is a comma-separated string
                    else if (row.days) {
                      days = row.days.split(',').map(day => mapDayToCode(day.trim()));
                    } 
                    // Default to weekdays if no days info
                    else {
                      days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    }
                    
                    // Format times
                    const startTime = formatTimeString(row.start_time || row.hora_ini || "08:00");
                    const endTime = formatTimeString(row.end_time || row.hora_fin || "09:00");
                    
                    programId = await createProgram(row.programa, channelId, days, startTime, endTime);
                    console.log(`Created new program: ${row.programa} with ID: ${programId}`);
                  } catch (err) {
                    console.error(`Error creating program for row ${i+1}:`, err);
                    continue; // Skip this row
                  }
                }
              }
              
              if (!channelId || !programId) {
                console.warn(`Missing channel or program ID for row ${i+1}`);
                continue;
              }
              
              // Process days
              let days: string[] = [];
              
              // Handle explicit days columns (L, K, M, J, V, S, D)
              if (row.l || row.k || row.m || row.j || row.v || row.s || row.d) {
                if (row.l?.toLowerCase() === 'si') days.push('Mon');
                if (row.k?.toLowerCase() === 'si') days.push('Tue');
                if (row.m?.toLowerCase() === 'si') days.push('Wed');
                if (row.j?.toLowerCase() === 'si') days.push('Thu');
                if (row.v?.toLowerCase() === 'si') days.push('Fri');
                if (row.s?.toLowerCase() === 'si') days.push('Sat');
                if (row.d?.toLowerCase() === 'si') days.push('Sun');
              } 
              // If days is a comma-separated string
              else if (row.days) {
                days = row.days.split(',').map(day => mapDayToCode(day.trim()));
              } 
              // Default to weekdays if no days info
              else {
                days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
              }
              
              // Process times
              const startTime = formatTimeString(row.start_time || row.hora_ini || "");
              const endTime = formatTimeString(row.end_time || row.hora_fin || "");
              
              if (!startTime || !endTime) {
                console.warn(`Missing time information for row ${i+1}`);
                continue;
              }
              
              // Process rates
              const rate15s = parseFloat(row.rate_15s || row["15s"] || "0") || null;
              const rate30s = parseFloat(row.rate_30s || row["30s"] || "0") || null;
              const rate45s = parseFloat(row.rate_45s || row["45s"] || "0") || null;
              const rate60s = parseFloat(row.rate_60s || row["60s"] || "0") || null;
              
              // Create the rate entry
              rates.push({
                id: uuid(),
                channel_id: channelId,
                program_id: programId,
                days,
                start_time: startTime,
                end_time: endTime,
                rate_15s: rate15s,
                rate_30s: rate30s,
                rate_45s: rate45s,
                rate_60s: rate60s
              });
            }
            
            if (rates.length === 0) {
              toast.warning("No se encontraron tarifas válidas para importar");
              resolve();
              return;
            }
            
            console.log(`Prepared ${rates.length} TV rates for import`);

            // Insert rates into the database
            const { error } = await supabase
              .from('tv_rates')
              .insert(rates);

            if (error) {
              console.error("Error importing TV rates:", error);
              toast.error("Error al importar tarifas de TV");
              reject(error);
              return;
            }

            toast.success(`Se importaron ${rates.length} tarifas correctamente`);
            resolve();
          } catch (error) {
            console.error("Error processing CSV data:", error);
            toast.error("Error al procesar datos CSV");
            reject(error);
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          toast.error("Error al analizar el archivo CSV");
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Error in importRatesFromCSV:", error);
    toast.error("Error en la importación de tarifas");
    throw error;
  }
};
