
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

export const importRatesFromCSV = async (file: File): Promise<void> => {
  try {
    return new Promise((resolve, reject) => {
      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rates = results.data.map((row: CSVRow) => ({
              channel_id: row.channel_id,
              program_id: row.program_id,
              days: typeof row.days === 'string' 
                ? row.days.split(',').map((day: string) => day.trim()) 
                : row.days,
              start_time: row.start_time,
              end_time: row.end_time,
              rate_15s: row.rate_15s ? parseFloat(row.rate_15s) : null,
              rate_30s: row.rate_30s ? parseFloat(row.rate_30s) : null,
              rate_45s: row.rate_45s ? parseFloat(row.rate_45s) : null,
              rate_60s: row.rate_60s ? parseFloat(row.rate_60s) : null,
            }));

            // Insert rates into the database
            const { error } = await supabase
              .from('tv_rates')
              .insert(rates);

            if (error) {
              console.error("Error importing TV rates:", error);
              reject(error);
              return;
            }

            resolve();
          } catch (error) {
            console.error("Error processing CSV data:", error);
            reject(error);
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Error in importRatesFromCSV:", error);
    throw error;
  }
};
