
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from 'papaparse';
import { TvRateType } from "../types";

interface CSVRow {
  channel_id: string;
  program_id: string;
  days: string;
  start_time: string;
  end_time: string;
  rate_15s?: string;
  rate_30s?: string;
  rate_45s?: string;
  rate_60s?: string;
}

// Map Spanish day names to English three-letter codes
const mapDayToCode = (day: string): string => {
  const dayMap: Record<string, string> = {
    'lunes': 'Mon',
    'martes': 'Tue',
    'miércoles': 'Wed',
    'miercoles': 'Wed',
    'jueves': 'Thu',
    'viernes': 'Fri',
    'sábado': 'Sat',
    'sabado': 'Sat',
    'domingo': 'Sun',
    // Already in English format
    'mon': 'Mon',
    'tue': 'Tue',
    'wed': 'Wed',
    'thu': 'Thu',
    'fri': 'Fri',
    'sat': 'Sat',
    'sun': 'Sun'
  };
  
  return dayMap[day.toLowerCase()] || day;
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
            
            // Check for required columns
            const requiredColumns = ['channel_id', 'program_id', 'days', 'start_time', 'end_time'];
            const missingColumns = requiredColumns.filter(
              col => !Object.keys(results.data[0]).includes(col)
            );
            
            if (missingColumns.length > 0) {
              toast.error(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
              reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
              return;
            }
            
            const rates = results.data.map((row: CSVRow) => {
              // Process days field - can be comma-separated or an array
              let days: string[] = [];
              if (typeof row.days === 'string') {
                days = row.days.split(',').map(day => {
                  const trimmedDay = day.trim();
                  return mapDayToCode(trimmedDay);
                });
              } else if (Array.isArray(row.days)) {
                days = row.days.map(mapDayToCode);
              }
              
              return {
                channel_id: row.channel_id,
                program_id: row.program_id,
                days: days,
                start_time: row.start_time,
                end_time: row.end_time,
                rate_15s: row.rate_15s ? parseFloat(row.rate_15s) : null,
                rate_30s: row.rate_30s ? parseFloat(row.rate_30s) : null,
                rate_45s: row.rate_45s ? parseFloat(row.rate_45s) : null,
                rate_60s: row.rate_60s ? parseFloat(row.rate_60s) : null,
              };
            });

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
