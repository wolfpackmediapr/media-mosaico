
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";
import { toast } from "sonner";

// Function to seed TV rates from the provided lists
export const seedTvRates = async (): Promise<void> => {
  try {
    // First clear existing rates
    const { error: deleteError } = await supabase
      .from('tv_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (deleteError) {
      console.error("Error clearing existing TV rates:", deleteError);
      toast.error("Error al limpiar tarifas existentes");
      return;
    }
    
    // Process both channels
    const telemundoRates = processTelemundoRates();
    const wapaRates = processWapaRates();
    const allRates = [...telemundoRates, ...wapaRates].filter(rate => 
      // Filter out rates with no values
      rate.rate_30s !== null || 
      rate.rate_15s !== null || 
      rate.rate_45s !== null || 
      rate.rate_60s !== null
    );
    
    // Insert in batches to avoid payload limits
    const batchSize = 50;
    for (let i = 0; i < allRates.length; i += batchSize) {
      const batch = allRates.slice(i, i + batchSize);
      
      // Ensure all required properties are present in each rate
      const validBatch = batch.map(rate => ({
        channel_id: rate.channel_id || '',
        program_id: rate.program_id || '',
        days: rate.days || [],
        start_time: rate.start_time || '',
        end_time: rate.end_time || '',
        rate_15s: rate.rate_15s,
        rate_30s: rate.rate_30s,
        rate_45s: rate.rate_45s,
        rate_60s: rate.rate_60s
      }));
      
      const { error } = await supabase
        .from('tv_rates')
        .insert(validBatch);
        
      if (error) {
        console.error(`Error inserting TV rates batch ${i}:`, error);
        toast.error(`Error al insertar lote de tarifas ${i}`);
        return;
      }
    }
    
    toast.success(`${allRates.length} tarifas de TV insertadas correctamente`);
  } catch (error) {
    console.error("Error seeding TV rates:", error);
    toast.error("Error al poblar tarifas de TV");
  }
};

// Helper to process Telemundo rates
const processTelemundoRates = (): Partial<TvRateType>[] => {
  // Telemundo channel ID - this would need to be updated with actual channel ID
  const channelId = "telemundo-channel-id";
  
  // Telemundo rates data structure
  const ratesData = [
    { name: "Acceso Total", time: "11pm a 11:30pm", rate: 3500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Acceso Total", time: "10:30pm a 11:30pm", rate: 3500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Acceso Total", time: "12am a 12:30am", rate: 3500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Al Rojo Vivo", time: "6am a 7am", rate: 550, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Al Rojo Vivo", time: "11:30pm a 12am", rate: 1600, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Alexandra a las 12", time: "11:30am a 1pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Alexandra de Noche", time: "11pm a 11:30pm", rate: 3500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Area Restringida", time: "6pm a 7pm", rate: 2500, days: ["Domingo"] },
    { name: "Borinqueando", time: "2:30pm a 3pm", rate: 1000, days: ["Sábado"] },
    { name: "Caso Cerrado", time: "4pm a 5pm", rate: 3900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Caso Cerrado", time: "7pm a 8pm", rate: 4900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Dando Candela", time: "6pm a 7pm", rate: 4475, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "De Magazine", time: "6pm a 7pm", rate: 3300, days: ["Sábado"] },
    { name: "Deportes Xtra Domingo", time: "10:30pm a 11pm", rate: 3500, days: ["Domingo"] },
    { name: "Deportes Xtra Sabado", time: "10:30pm a 11pm", rate: 3500, days: ["Sábado"] },
    { name: "Día a Día", time: "1pm a 4pm", rate: 1600, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Dra Mama", time: "2pm a 2:30pm", rate: 1000, days: ["Sábado"] },
    { name: "Espectacular Ser", time: "7pm a 11pm", rate: 5625, days: ["Lunes"] },
    { name: "Hoy Día Puerto Rico", time: "8am a 10am", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Jay y Sus Rayos X", time: "9pm a 10pm", rate: 5500, days: ["Jueves"] },
    { name: "Jugando Pelota Dura Extra Inning", time: "8pm a 8:30pm", rate: 4000, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Latin Doctor", time: "1pm a 2pm", rate: 1500, days: ["Domingo"] },
    { name: "Levantate", time: "7am a 10am", rate: 1000, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Muñequitos", time: "10am a 12pm", rate: 900, days: ["Sábado"] },
    { name: "Nación Z", time: "6am a 8am", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Notiuno Presenta", time: "11pm a 12am", rate: 1000, days: ["Domingo"] },
    { name: "Novela", time: "8pm a 9pm", rate: 3900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Novela", time: "9pm a 10pm", rate: 3900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Novela", time: "12pm a 2pm", rate: 1000, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Primera Pregunta", time: "5:30pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Programacion Especial", time: "7pm a 10pm", rate: 2750, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] },
    { name: "Raymond y Sus Amigos", time: "8pm a 10pm", rate: 6500, days: ["Martes"] },
    { name: "Rayos X", time: "10pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Telemaraton MDA", time: "11am a 10pm", rate: 2750, days: ["Domingo"] },
    { name: "Telenoticias 5", time: "5pm", rate: 5900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Telenoticias 10pm", time: "10pm", rate: 4500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Telenoticias 11", time: "11am", rate: 1300, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Telenoticias 11pm", time: "11pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Telenoticias Domingo 5PM", time: "5pm a 6pm", rate: 4000, days: ["Domingo"] },
    { name: "Telenoticias Domingo 10PM", time: "10pm a 10:30pm", rate: 4500, days: ["Domingo"] },
    { name: "Telenoticias Sabado 5PM", time: "5pm a 6pm", rate: 4000, days: ["Sábado"] },
    { name: "Telenoticias Sabado 10PM", time: "10pm a 11pm", rate: 3900, days: ["Sábado"] },
    { name: "Telenoticias edición especial", time: "4pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Telenoticias edición domingo", time: "5pm", rate: null, days: ["Domingo"] },
    { name: "Telenoticias edición domingo", time: "10pm", rate: null, days: ["Domingo"] },
    { name: "Telenoticias edición domingo", time: "11pm", rate: null, days: ["Domingo"] },
    { name: "Telenoticias edición sábado", time: "10pm", rate: null, days: ["Sábado"] },
    { name: "Tu Salud Informa", time: "12:30pm a 1pm", rate: 900, days: ["Sábado"] },
    { name: "TVO", time: "7pm a 8pm", rate: 4500, days: ["Domingo"] },
    { name: "Zona Y", time: "12:30pm a 1pm", rate: 1375, days: ["Sábado"] },
  ];
  
  // Map to TV rate objects
  return ratesData.map(entry => {
    const [startTime, endTime] = parseTimeRange(entry.time);
    
    return {
      channel_id: channelId,
      program_id: `${entry.name.toLowerCase().replace(/\s+/g, '-')}-id`,
      days: entry.days,
      start_time: startTime,
      end_time: endTime,
      rate_30s: entry.rate,
      rate_15s: entry.rate ? Math.round(entry.rate * 0.6) : null,
      rate_45s: entry.rate ? Math.round(entry.rate * 1.3) : null,
      rate_60s: entry.rate ? Math.round(entry.rate * 1.6) : null,
    };
  });
};

// Helper to process WAPA rates
const processWapaRates = (): Partial<TvRateType>[] => {
  // WAPA channel ID - this would need to be updated with actual channel ID
  const channelId = "wapa-channel-id";
  
  // WAPA rates data structure
  const ratesData = [
    { name: "Ahi Esta La Verdad", time: "9pm a 10pm", rate: 3200, days: ["Jueves"] },
    { name: "Ahi Esta La Verdad", time: "9pm a 10pm", rate: 3200, days: ["Domingo"] },
    { name: "Cu4rto Poder", time: "10pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "El Tiempo Es Oro", time: "3pm a 4pm", rate: 1800, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "El Tiempo Es Oro", time: "3pm a 4:20pm", rate: 1800, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Entre Nosotras", time: "9:30am a 11am", rate: 1000, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Gana Con Ganas", time: "3pm a 4pm", rate: 1800, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Idol Puerto Rico", time: "9pm a 11pm", rate: 6000, days: ["Lunes"] },
    { name: "Jangueo", time: "11:30pm a 11:59pm", rate: 700, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Jangueo", time: "12am a 12:30am", rate: 250, days: ["Sábado"] },
    { name: "Jangueo", time: "12am a 12:30am", rate: 250, days: ["Domingo"] },
    { name: "Juntos En La Mañana", time: "9:30am a 11:30am", rate: 500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "LST", time: "2pm a 3:20pm", rate: 3200, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Lo sé todo", time: "2pm", rate: 3200, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Los datos son los datos", time: "3:20pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Monica En Confianza", time: "10pm a 11pm", rate: 1600, days: ["Lunes"] },
    { name: "Noticentro 11 AM", time: "11am", rate: 900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Noticentro 4 Al Amanecer", time: "5am a 9:30am", rate: 900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Noticentro Edición Domingo", time: "5pm", rate: 3000, days: ["Domingo"] },
    { name: "Noticentro Edición Domingo", time: "10pm", rate: 2000, days: ["Domingo"] },
    { name: "Noticentro Edición Estelar", time: "4pm", rate: null, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Noticentro Edición Nocturna", time: "11pm", rate: 2500, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Noticentro Edición Sábado", time: "5pm", rate: 3000, days: ["Sábado"] },
    { name: "Noticentro Edición Sábado", time: "10pm", rate: 1600, days: ["Sábado"] },
    { name: "Noticentro En Una Semana", time: "10:30pm a 11pm", rate: 2700, days: ["Sábado"] },
    { name: "Noticentro Sabado 11PM", time: "11pm a 11:30pm", rate: 1600, days: ["Sábado"] },
    { name: "Noticentro Sabado A Las 11PM", time: "11pm a 11:30pm", rate: 3600, days: ["Sábado"] },
    { name: "Noticentro a las 5", time: "5pm", rate: 3300, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Noticentro al amanecer", time: "5am", rate: 900, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Novela", time: "1pm a 2pm", rate: 800, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Pegate al Medio Día", time: "11:30am a 1pm", rate: 1000, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Pégate al mediodía", time: "11:30am a 1pm", rate: 1000, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Programa Especial Junta de Control Fiscal", time: "10pm a 11pm", rate: 5100, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Risas En Combo", time: "9pm a 10pm", rate: 6500, days: ["Miércoles"] },
    { name: "Super Xclusivo", time: "6pm a 7pm", rate: 4300, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "SuperCine", time: "7pm a 9pm", rate: 4600, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Viva la tarde", time: "1pm", rate: 800, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { name: "Wapa a las Cuatro", time: "4pm a 5pm", rate: 1700, days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
  ];
  
  // Map to TV rate objects
  return ratesData.map(entry => {
    const [startTime, endTime] = parseTimeRange(entry.time);
    
    return {
      channel_id: channelId,
      program_id: `${entry.name.toLowerCase().replace(/\s+/g, '-')}-id`,
      days: entry.days,
      start_time: startTime,
      end_time: endTime || startTime, // If no end time, use start time
      rate_30s: entry.rate,
      rate_15s: entry.rate ? Math.round(entry.rate * 0.6) : null,
      rate_45s: entry.rate ? Math.round(entry.rate * 1.3) : null,
      rate_60s: entry.rate ? Math.round(entry.rate * 1.6) : null,
    };
  });
};

// Helper function to parse time ranges like "10:30pm a 11pm"
const parseTimeRange = (timeStr: string): [string, string] => {
  if (!timeStr.includes('a')) {
    // Single time like "5pm"
    return [timeStr, timeStr];
  }
  
  const [start, end] = timeStr.split(' a ').map(t => t.trim());
  return [start, end];
};
