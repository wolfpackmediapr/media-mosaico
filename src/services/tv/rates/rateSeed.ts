
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";
import { uuid } from "@/lib/utils";
import { fetchChannels } from "../channelService";
import { fetchPrograms } from "../programService";
import { toast } from "sonner";

// Helper interface for parsing rates
interface RateEntry {
  program: string;
  channel: string;
  days: string[];
  startTime: string;
  endTime: string;
  rate: number | null;
}

// Helper to parse days from string format
const parseDaysFromString = (dayString: string): string[] => {
  const days: string[] = [];
  
  // Handle comma-separated day lists like "Lunes, Martes, Miércoles"
  if (dayString.includes(',')) {
    const dayParts = dayString.split(',').map(d => d.trim());
    return dayParts.map(day => mapDayNameToCode(day));
  }
  
  // Check for individual days
  if (dayString.toLowerCase().includes('lunes') || dayString.toLowerCase() === 'l') days.push('Mon');
  if (dayString.toLowerCase().includes('martes') || dayString.toLowerCase() === 'k') days.push('Tue');
  if (dayString.toLowerCase().includes('miércoles') || dayString.toLowerCase().includes('miercoles') || dayString.toLowerCase() === 'm') days.push('Wed');
  if (dayString.toLowerCase().includes('jueves') || dayString.toLowerCase() === 'j') days.push('Thu');
  if (dayString.toLowerCase().includes('viernes') || dayString.toLowerCase() === 'v') days.push('Fri');
  if (dayString.toLowerCase().includes('sábado') || dayString.toLowerCase().includes('sabado') || dayString.toLowerCase() === 's') days.push('Sat');
  if (dayString.toLowerCase().includes('domingo') || dayString.toLowerCase() === 'd') days.push('Sun');
  
  return days;
};

// Map Spanish day names to English three-letter codes
const mapDayNameToCode = (dayName: string): string => {
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
    'd': 'Sun'
  };
  
  return dayMap[dayName.toLowerCase()] || dayName;
};

// Format time string to ensure HH:MM format
const formatTimeString = (timeStr: string): string => {
  if (!timeStr) return '00:00';
  
  // Already in the right format
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    return timeStr.substring(0, 5); // Take only HH:MM part
  }
  
  // Parse different formats like "11am", "2:30 PM"
  try {
    // Remove any non-essential characters
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

export const seedTvRates = async (): Promise<void> => {
  try {
    console.log("Starting TV rates seeding process...");
    
    // Clear existing rates first
    const { error: deleteError } = await supabase
      .from('tv_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Safe deletion of all records
    
    if (deleteError) {
      console.error("Error deleting existing TV rates:", deleteError);
      toast.error("Error al limpiar las tarifas existentes");
      throw deleteError;
    }
    
    console.log("Existing TV rates cleared successfully");
    
    // Fetch real channels and programs to use their IDs
    const channels = await fetchChannels();
    const programs = await fetchPrograms();
    
    console.log(`Loaded ${channels.length} channels and ${programs.length} programs`);
    
    if (channels.length === 0 || programs.length === 0) {
      console.error("Cannot seed rates: No channels or programs available");
      toast.error("No hay canales o programas disponibles para cargar tarifas");
      throw new Error("No channels or programs available");
    }
    
    // Create rates for each channel/program combination
    const rates: Array<{
      id: string;
      channel_id: string;
      program_id: string;
      days: string[];
      start_time: string;
      end_time: string;
      rate_15s: number | null;
      rate_30s: number | null;
      rate_45s: number | null;
      rate_60s: number | null;
    }> = [];
    
    // Function to find or create a program in a specific channel
    const findOrCreateProgram = async (channelId: string, programName: string, startTime?: string, endTime?: string, days?: string[]): Promise<string> => {
      // Clean program name
      const cleanName = programName.trim();
      
      // First try to find an exact match
      let program = programs.find(p => 
        p.channel_id === channelId && 
        p.name.toLowerCase() === cleanName.toLowerCase()
      );
      
      // If not found, try a substring match
      if (!program) {
        program = programs.find(p => 
          p.channel_id === channelId && 
          p.name.toLowerCase().includes(cleanName.toLowerCase())
        );
      }
      
      // If not found, try a more fuzzy match
      if (!program) {
        program = programs.find(p => 
          p.channel_id === channelId && 
          cleanName.toLowerCase().includes(p.name.toLowerCase())
        );
      }
      
      if (program) {
        console.log(`Found existing program: ${program.name} for channel ID: ${channelId}`);
        return program.id;
      }
      
      // If program not found, create it
      console.log(`Creating new program: ${cleanName} for channel ID: ${channelId}`);
      
      const defaultDays = days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const defaultStartTime = startTime || '08:00';
      const defaultEndTime = endTime || '09:00';
      
      // Insert the new program
      const { data: newProgram, error } = await supabase
        .from('tv_programs')
        .insert({
          name: cleanName,
          channel_id: channelId,
          days: defaultDays,
          start_time: defaultStartTime,
          end_time: defaultEndTime
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating program ${cleanName}:`, error);
        throw error;
      }
      
      // Add to our local programs array for future lookups
      if (newProgram) {
        programs.push(newProgram);
        return newProgram.id;
      }
      
      throw new Error(`Failed to create program: ${cleanName}`);
    };
    
    // Helper to find a channel by name pattern
    const findChannelByName = (namePattern: string): { id: string, name: string } | null => {
      const channel = channels.find(c => 
        c.name.toLowerCase() === namePattern.toLowerCase() ||
        c.name.toLowerCase().includes(namePattern.toLowerCase()) ||
        namePattern.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (channel) {
        return { id: channel.id, name: channel.name };
      }
      
      console.warn(`Channel not found: ${namePattern}`);
      return null;
    };
    
    // Utility function to create a rate entry
    const createRate = (
      channelId: string,
      programId: string,
      days: string[],
      startTime: string,
      endTime: string,
      rate15s: number | null,
      rate30s: number | null,
      rate45s: number | null,
      rate60s: number | null
    ) => {
      return {
        id: uuid(),
        channel_id: channelId,
        program_id: programId,
        days: days,
        start_time: startTime,
        end_time: endTime,
        rate_15s: rate15s,
        rate_30s: rate30s,
        rate_45s: rate45s,
        rate_60s: rate60s
      };
    };
    
    // ===== ADD TELEMUNDO RATES =====
    const telemundoChannel = findChannelByName("TELEMUNDO");
    if (telemundoChannel) {
      console.log(`Adding Telemundo rates for channel ID: ${telemundoChannel.id}`);
      
      // Batch of Telemundo programs
      const telemundoRates = [
        { program: "Acceso Total", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:00", endTime: "11:30", rate: 3500 },
        { program: "Acceso Total", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "10:30", endTime: "11:30", rate: 3500 },
        { program: "Acceso Total", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "00:00", endTime: "00:30", rate: 3500 },
        { program: "Al Rojo Vivo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "06:00", endTime: "07:00", rate: 550 },
        { program: "Al Rojo Vivo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "23:30", endTime: "00:00", rate: 1600 },
        { program: "Alexandra de Noche", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "23:00", endTime: "23:30", rate: 3500 },
        { program: "Area Restringida", days: ["Sun"], startTime: "18:00", endTime: "19:00", rate: 2500 },
        { program: "Borinqueando", days: ["Sat"], startTime: "14:30", endTime: "15:00", rate: 1000 },
        { program: "Caso Cerrado", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "16:00", endTime: "17:00", rate: 3900 },
        { program: "Caso Cerrado", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "19:00", endTime: "20:00", rate: 4900 },
        { program: "Dando Candela", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "18:00", endTime: "19:00", rate: 4475 },
        { program: "De Magazine", days: ["Sat"], startTime: "18:00", endTime: "19:00", rate: 3300 },
        { program: "Deportes Xtra Domingo", days: ["Sun"], startTime: "22:30", endTime: "23:00", rate: 3500 },
        { program: "Deportes Xtra Sabado", days: ["Sat"], startTime: "22:30", endTime: "23:00", rate: 3500 },
        { program: "Día a Día", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "13:00", endTime: "16:00", rate: 1600 },
        { program: "Dra Mama", days: ["Sat"], startTime: "14:00", endTime: "14:30", rate: 1000 },
        { program: "Espectacular Ser", days: ["Mon"], startTime: "19:00", endTime: "23:00", rate: 5625 },
        { program: "Jay y Sus Rayos X", days: ["Thu"], startTime: "21:00", endTime: "22:00", rate: 5500 },
        { program: "Jugando Pelota Dura Extra Inning", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "20:00", endTime: "20:30", rate: 4000 },
        { program: "Latin Doctor", days: ["Sun"], startTime: "13:00", endTime: "14:00", rate: 1500 },
        { program: "Levantate", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "07:00", endTime: "10:00", rate: 1000 },
        { program: "Muñequitos", days: ["Sat"], startTime: "10:00", endTime: "12:00", rate: 900 },
        { program: "Notiuno Presenta", days: ["Sun"], startTime: "23:00", endTime: "00:00", rate: 1000 },
        { program: "Novela", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "20:00", endTime: "21:00", rate: 3900 },
        { program: "Novela", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "21:00", endTime: "22:00", rate: 3900 },
        { program: "Novela", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "12:00", endTime: "14:00", rate: 1000 },
        { program: "Programacion Especial", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "19:00", endTime: "22:00", rate: 2750 },
        { program: "Raymond y Sus Amigos", days: ["Tue"], startTime: "20:00", endTime: "22:00", rate: 6500 },
        { program: "Telemaraton MDA", days: ["Sun"], startTime: "11:00", endTime: "22:00", rate: 2750 },
        { program: "Telenoticias 5", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "17:00", endTime: "18:00", rate: 5900 },
        { program: "Telenoticias 10pm", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "22:00", endTime: "23:00", rate: 4500 },
        { program: "Telenoticias 11", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:00", endTime: "12:00", rate: 1300 },
        { program: "Telenoticias Domingo 5PM", days: ["Sun"], startTime: "17:00", endTime: "18:00", rate: 4000 },
        { program: "Telenoticias Domingo 10PM", days: ["Sun"], startTime: "22:00", endTime: "22:30", rate: 4500 },
        { program: "Telenoticias Sabado 5PM", days: ["Sat"], startTime: "17:00", endTime: "18:00", rate: 4000 },
        { program: "Telenoticias Sabado 10PM", days: ["Sat"], startTime: "22:00", endTime: "23:00", rate: 3900 },
        { program: "Tu Salud Informa", days: ["Sat"], startTime: "12:30", endTime: "13:00", rate: 900 },
        { program: "TVO", days: ["Sun"], startTime: "19:00", endTime: "20:00", rate: 4500 },
        { program: "Zona Y", days: ["Sat"], startTime: "12:30", endTime: "13:00", rate: 1375 }
      ];
      
      for (const rateData of telemundoRates) {
        try {
          const programId = await findOrCreateProgram(
            telemundoChannel.id, 
            rateData.program,
            rateData.startTime,
            rateData.endTime,
            rateData.days
          );
          
          rates.push(createRate(
            telemundoChannel.id,
            programId,
            rateData.days,
            rateData.startTime,
            rateData.endTime,
            null, // rate_15s
            rateData.rate, // rate_30s
            null, // rate_45s
            null // rate_60s
          ));
        } catch (err) {
          console.error(`Error adding rate for ${rateData.program}:`, err);
        }
      }
    } else {
      console.warn("Telemundo channel not found!");
    }
    
    // ===== ADD WAPA RATES =====
    const wapaChannel = findChannelByName("WAPA");
    if (wapaChannel) {
      console.log(`Adding WAPA rates for channel ID: ${wapaChannel.id}`);
      
      // Batch of WAPA programs
      const wapaRates = [
        { program: "Ahi Esta La Verdad", days: ["Thu", "Sun"], startTime: "21:00", endTime: "22:00", rate: 3200 },
        { program: "El Tiempo Es Oro", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "15:00", endTime: "16:00", rate: 1800 },
        { program: "El Tiempo Es Oro", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "15:00", endTime: "16:20", rate: 1800 },
        { program: "Entre Nosotras", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "09:30", endTime: "11:00", rate: 1000 },
        { program: "Gana Con Ganas", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "15:00", endTime: "16:00", rate: 1800 },
        { program: "Idol Puerto Rico", days: ["Mon"], startTime: "21:00", endTime: "23:00", rate: 6000 },
        { program: "Jangueo", days: ["Mon", "Tue", "Wed", "Fri"], startTime: "23:30", endTime: "23:59", rate: 700 },
        { program: "Jangueo", days: ["Sat"], startTime: "00:00", endTime: "00:30", rate: 250 },
        { program: "Jangueo", days: ["Sun"], startTime: "00:00", endTime: "00:30", rate: 250 },
        { program: "Juntos En La Mañana", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "09:30", endTime: "11:30", rate: 500 },
        { program: "LST", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "14:00", endTime: "15:20", rate: 3200 },
        { program: "Lo sé todo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "14:00", endTime: "15:00", rate: 3200 },
        { program: "Monica En Confianza", days: ["Mon"], startTime: "22:00", endTime: "23:00", rate: 1600 },
        { program: "Noticentro 11 AM", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:00", endTime: "11:30", rate: 900 },
        { program: "Noticentro 4 Al Amanecer", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "05:00", endTime: "09:30", rate: 900 },
        { program: "Noticentro Edición Domingo", days: ["Sun"], startTime: "17:00", endTime: "18:00", rate: 3000 },
        { program: "Noticentro Edición Domingo", days: ["Sun"], startTime: "22:00", endTime: "23:00", rate: 2000 },
        { program: "Noticentro Edición Nocturna", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "23:00", endTime: "00:00", rate: 2500 },
        { program: "Noticentro Edición Sábado", days: ["Sat"], startTime: "17:00", endTime: "18:00", rate: 3000 },
        { program: "Noticentro Edición Sábado", days: ["Sat"], startTime: "22:00", endTime: "23:00", rate: 1600 },
        { program: "Noticentro En Una Semana", days: ["Sat"], startTime: "22:30", endTime: "23:00", rate: 2700 },
        { program: "Noticentro Sabado 11PM", days: ["Sat"], startTime: "23:00", endTime: "23:30", rate: 1600 },
        { program: "Noticentro Sabado A Las 11PM", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], startTime: "23:00", endTime: "23:30", rate: 3600 },
        { program: "Noticentro a las 5", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "17:00", endTime: "18:00", rate: 3300 },
        { program: "Noticentro al amanecer", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "05:00", endTime: "06:00", rate: 900 },
        { program: "Novela", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "13:00", endTime: "14:00", rate: 800 },
        { program: "Pegate al Medio Día", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:30", endTime: "13:00", rate: 1000 },
        { program: "Pégate al mediodía", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:30", endTime: "13:00", rate: 1000 },
        { program: "Programa Especial Junta de Control Fiscal", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "22:00", endTime: "23:00", rate: 5100 },
        { program: "Risas En Combo", days: ["Wed"], startTime: "21:00", endTime: "22:00", rate: 6500 },
        { program: "Super Xclusivo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "18:00", endTime: "19:00", rate: 4300 },
        { program: "SuperCine", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "19:00", endTime: "21:00", rate: 4600 },
        { program: "Viva la tarde", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "13:00", endTime: "14:00", rate: 800 },
        { program: "Wapa a las Cuatro", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "16:00", endTime: "17:00", rate: 1700 }
      ];
      
      for (const rateData of wapaRates) {
        try {
          const programId = await findOrCreateProgram(
            wapaChannel.id, 
            rateData.program,
            rateData.startTime,
            rateData.endTime,
            rateData.days
          );
          
          rates.push(createRate(
            wapaChannel.id,
            programId,
            rateData.days,
            rateData.startTime,
            rateData.endTime,
            null, // rate_15s
            rateData.rate, // rate_30s
            null, // rate_45s
            null // rate_60s
          ));
        } catch (err) {
          console.error(`Error adding rate for ${rateData.program}:`, err);
        }
      }
    } else {
      console.warn("WAPA channel not found!");
    }

    // Set up for additional networks
    const wiprChannel = findChannelByName("WIPR");
    if (wiprChannel) {
      console.log(`Adding WIPR rates for channel ID: ${wiprChannel.id}`);
      
      // Add WIPR programs from the user provided data
      const wiprRates = [
        { program: "NOTICIAS DE LA MAÑANA 940 AM", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "06:00", endTime: "09:00", rate: 200 },
        { program: "TU CASA Y TU DINERO CON BARBARA SERRANO", days: ["Sun"], startTime: "10:00", endTime: "10:30", rate: 300 },
        { program: "TRANSMICION DE LAS OLIMPIADAS 2012", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "14:00", endTime: "16:00", rate: 350 },
        { program: "CULTURA VIVA", days: ["Sat"], startTime: "19:00", endTime: "20:00", rate: 400 },
        { program: "CONTIGO", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "14:00", endTime: "15:30", rate: 350 },
        { program: "UN BUEN DIA", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "08:00", endTime: "10:00", rate: 300 },
        { program: "NOTISEIS 360", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "18:00", endTime: "19:00", rate: 600 },
        { program: "AQUI ESTAMOS", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "19:00", endTime: "20:00", rate: 300 }
      ];
      
      for (const rateData of wiprRates) {
        try {
          const programId = await findOrCreateProgram(
            wiprChannel.id, 
            rateData.program,
            rateData.startTime,
            rateData.endTime,
            rateData.days
          );
          
          rates.push(createRate(
            wiprChannel.id,
            programId,
            rateData.days,
            rateData.startTime,
            rateData.endTime,
            null, // rate_15s
            rateData.rate, // rate_30s
            null, // rate_45s
            null // rate_60s
          ));
        } catch (err) {
          console.error(`Error adding rate for ${rateData.program}:`, err);
        }
      }
    }
    
    // Add additional channels/rates as needed

    if (rates.length === 0) {
      console.warn("No rates prepared to seed - check your channel/program mappings");
      toast.warning("No se pudieron preparar tarifas para sembrar");
      return;
    }
    
    console.log(`Prepared ${rates.length} TV rates for seeding`);
    
    // Insert the seed rates into the database
    const { error } = await supabase
      .from('tv_rates')
      .insert(rates);
    
    if (error) {
      console.error("Error seeding TV rates:", error);
      toast.error("Error al sembrar tarifas de TV");
      throw error;
    }
    
    console.log(`Successfully seeded ${rates.length} TV rates`);
    toast.success(`Se sembraron ${rates.length} tarifas de TV exitosamente`);
    
  } catch (error) {
    console.error("Failed to seed TV rates:", error);
    toast.error("Error al sembrar tarifas de TV");
    throw error;
  }
};
