
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";
import { uuid } from "@/lib/utils";
import { fetchChannels } from "../channelService";
import { fetchPrograms } from "../programService";
import { toast } from "sonner";

// Helper interface for parsed rates
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

// Improved fuzzy name matcher for programs and channels 
const fuzzyMatch = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  
  // Normalize both strings: lowercase, remove accents, remove special chars
  const normalize = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w\s]/gi, ''); // Remove special characters
  };
  
  const norm1 = normalize(name1);
  const norm2 = normalize(name2);
  
  // Direct match
  if (norm1 === norm2) return true;
  
  // Substring match (one contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Words match (check if all words from one string appear in the other)
  const words1 = norm1.split(/\s+/).filter(w => w.length > 2); // Only words longer than 2 chars
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);
  
  // If all significant words from the shorter list are in the longer one
  if (words1.length <= words2.length) {
    return words1.every(word => norm2.includes(word));
  } else {
    return words2.every(word => norm1.includes(word));
  }
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
    
    // Function to find channel by name with improved matching
    const findChannelById = (id: string): { id: string, name: string } | null => {
      const channel = channels.find(c => c.id === id);
      return channel ? { id: channel.id, name: channel.name } : null;
    };
    
    // Function to find channel by name with improved matching
    const findChannelByName = (namePattern: string): { id: string, name: string } | null => {
      // Try exact match first
      const exactMatch = channels.find(c => c.name.toLowerCase() === namePattern.toLowerCase());
      if (exactMatch) {
        return { id: exactMatch.id, name: exactMatch.name };
      }
      
      // Try fuzzy match next
      const fuzzyMatched = channels.find(c => fuzzyMatch(c.name, namePattern));
      if (fuzzyMatched) {
        return { id: fuzzyMatched.id, name: fuzzyMatched.name };
      }
      
      console.warn(`Channel not found: ${namePattern}`);
      return null;
    };
    
    // Function to find or create a program in a specific channel with improved matching
    const findOrCreateProgram = async (
      channelId: string, 
      programName: string, 
      startTime?: string, 
      endTime?: string, 
      days?: string[]
    ): Promise<string> => {
      // Clean program name
      const cleanName = programName.trim();
      
      // First try to find an exact match
      let program = programs.find(p => 
        p.channel_id === channelId && 
        p.name.toLowerCase() === cleanName.toLowerCase()
      );
      
      // If not found, try a fuzzy match
      if (!program) {
        program = programs.find(p => 
          p.channel_id === channelId && 
          fuzzyMatch(p.name, cleanName)
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
      
      try {
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
          console.log(`Program created successfully: ${cleanName}, ID: ${newProgram.id}`);
          return newProgram.id;
        }
        
        throw new Error(`Failed to create program: ${cleanName}`);
      } catch (err) {
        console.error(`Error creating program ${cleanName}:`, err);
        throw err;
      }
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
        { program: "Al Rojo Vivo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "06:00", endTime: "07:00", rate: 550 },
        { program: "Al Rojo Vivo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "23:30", endTime: "00:00", rate: 1600 },
        { program: "Alexandra de Noche", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "23:00", endTime: "23:30", rate: 3500 },
        { program: "Caso Cerrado", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "16:00", endTime: "17:00", rate: 3900 },
        { program: "Caso Cerrado", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "19:00", endTime: "20:00", rate: 4900 },
        { program: "Dia a Dia", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "13:00", endTime: "16:00", rate: 1600 },
        { program: "Hoy Dia Puerto Rico", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "08:00", endTime: "10:00", rate: 1000 },
        { program: "Telenoticias 5", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "17:00", endTime: "18:00", rate: 5900 },
        { program: "Telenoticias 10pm", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "22:00", endTime: "23:00", rate: 4500 },
        { program: "Telenoticias 11", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:00", endTime: "11:30", rate: 1300 }
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
          
          console.log(`Created rate for ${rateData.program} on ${telemundoChannel.name}`);
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
        { program: "Noticentro al amanecer", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "05:00", endTime: "09:00", rate: 900 },
        { program: "Noticentro 11 AM", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:00", endTime: "11:30", rate: 900 },
        { program: "Pégate al mediodía", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "11:30", endTime: "13:00", rate: 1000 },
        { program: "Viva la tarde", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "13:00", endTime: "14:00", rate: 800 },
        { program: "Lo sé todo", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "14:00", endTime: "15:00", rate: 3200 },
        { program: "Noticentro a las 5", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "17:00", endTime: "18:00", rate: 3300 },
        { program: "Noticentro Edición Nocturna", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "23:00", endTime: "23:30", rate: 2500 }
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
          
          console.log(`Created rate for ${rateData.program} on ${wapaChannel.name}`);
        } catch (err) {
          console.error(`Error adding rate for ${rateData.program}:`, err);
        }
      }
    } else {
      console.warn("WAPA channel not found!");
    }

    // Set up for WIPR network
    const wiprChannel = findChannelByName("WIPR");
    if (wiprChannel) {
      console.log(`Adding WIPR rates for channel ID: ${wiprChannel.id}`);
      
      // Add WIPR programs
      const wiprRates = [
        { program: "NOTICIAS DE LA MAÑANA", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "06:00", endTime: "09:00", rate: 200 },
        { program: "CONTIGO", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "14:00", endTime: "15:30", rate: 350 },
        { program: "UN BUEN DIA", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "08:00", endTime: "10:00", rate: 300 },
        { program: "NOTISEIS 360", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "18:00", endTime: "19:00", rate: 600 }
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
          
          console.log(`Created rate for ${rateData.program} on ${wiprChannel.name}`);
        } catch (err) {
          console.error(`Error adding rate for ${rateData.program}:`, err);
        }
      }
    }
    
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
