
import { supabase } from "@/integrations/supabase/client";
import { saveStoredPrograms, getStoredPrograms } from "./utils";

// Current data version for versioning control
const CURRENT_DATA_VERSION = "1.0";

// Seed function to initialize the database with the provided TV data
export async function seedTvData(forceRefresh = false) {
  try {
    // Check if data version is current
    const currentVersion = localStorage.getItem('tv_data_version');
    
    // First check if we already have data
    const { data: existingChannels } = await supabase
      .from('media_outlets')
      .select('count')
      .eq('type', 'tv')
      .single();
      
    // Check for programs in localStorage
    const storedPrograms = getStoredPrograms();
    
    // Only proceed with seeding if channels don't exist, programs are empty, 
    // version mismatch, or force refresh is requested
    const shouldSeedChannels = !existingChannels || existingChannels.count === 0;
    const shouldSeedPrograms = forceRefresh || 
                              storedPrograms.length === 0 || 
                              currentVersion !== CURRENT_DATA_VERSION;
    
    if (!shouldSeedChannels && !shouldSeedPrograms) {
      console.log('TV data already seeded and up to date');
      return; // Data already exists and is current, don't seed
    }
    
    // Predefined channels with their programs
    const channelsData = [
      {
        name: "Telemundo",
        code: "C02",
        programs: [
          { name: "Nación Z", start_time: "06:00", end_time: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Hoy Día Puerto Rico", start_time: "08:00", end_time: "10:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias 11", start_time: "11:00", end_time: "11:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Alexandra a las 12", start_time: "11:30", end_time: "13:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Día a Día", start_time: "13:00", end_time: "16:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias edición especial", start_time: "16:00", end_time: "17:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias 5", start_time: "17:00", end_time: "17:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Primera Pregunta", start_time: "17:30", end_time: "18:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias 10pm", start_time: "22:00", end_time: "23:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Rayos X", start_time: "22:00", end_time: "23:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias 11pm", start_time: "23:00", end_time: "23:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias edición sábado", start_time: "22:00", end_time: "23:00", days: ["Sat"] },
          { name: "Telenoticias edición domingo", start_time: "17:00", end_time: "18:00", days: ["Sun"] },
          { name: "Telenoticias edición domingo", start_time: "22:00", end_time: "23:00", days: ["Sun"] },
          { name: "Telenoticias edición domingo", start_time: "23:00", end_time: "23:30", days: ["Sun"] }
        ]
      },
      {
        name: "WAPA",
        code: "C04",
        programs: [
          { name: "Noticentro al amanecer", start_time: "05:00", end_time: "09:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Noticentro 11 AM", start_time: "11:00", end_time: "11:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Pégate al mediodía", start_time: "11:30", end_time: "13:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Viva la tarde", start_time: "13:00", end_time: "14:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Lo sé todo", start_time: "14:00", end_time: "15:20", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Los datos son los datos", start_time: "15:20", end_time: "16:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Noticentro Edición Estelar", start_time: "16:00", end_time: "17:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Noticentro a las 5", start_time: "17:00", end_time: "18:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Cu4rto Poder", start_time: "22:00", end_time: "23:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Noticentro Edición Nocturna", start_time: "23:00", end_time: "23:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Noticentro Edición Sábado", start_time: "17:00", end_time: "18:00", days: ["Sat"] },
          { name: "Noticentro Edición Sábado", start_time: "22:00", end_time: "23:00", days: ["Sat"] },
          { name: "Noticentro Edición Domingo", start_time: "17:00", end_time: "18:00", days: ["Sun"] },
          { name: "Noticentro Edición Domingo", start_time: "22:00", end_time: "23:00", days: ["Sun"] }
        ]
      },
      {
        name: "WIPR",
        code: "C06",
        programs: [
          { name: "Informe 940", start_time: "06:00", end_time: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Un buen Día", start_time: "08:00", end_time: "10:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Notiséis", start_time: "10:30", end_time: "11:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "El Mediodía", start_time: "12:30", end_time: "14:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Notiséis", start_time: "18:00", end_time: "19:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Aquí estamos", start_time: "19:00", end_time: "20:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Al Gusto", start_time: "20:00", end_time: "21:00", days: ["Wed"] },
          { name: "Homenaje", start_time: "20:00", end_time: "21:00", days: ["Tue"] }
        ]
      },
      {
        name: "TeleOnce",
        code: "C11",
        programs: [
          { name: "En la mañana", start_time: "06:00", end_time: "10:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "PR en vivo", start_time: "11:00", end_time: "12:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Las Noticias al Mediodía", start_time: "12:00", end_time: "12:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "El poder del pueblo", start_time: "15:00", end_time: "16:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Las Noticias Ahora", start_time: "16:00", end_time: "17:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Las Noticias Prime", start_time: "17:00", end_time: "18:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Última Palabra", start_time: "17:55", end_time: "18:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Jugando Pelota Dura: Pre Game", start_time: "18:30", end_time: "19:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Jugando Pelota Dura", start_time: "19:00", end_time: "20:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Jugando Pelota Dura Extra Inning", start_time: "20:00", end_time: "20:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Las Noticias Ultima Edición", start_time: "23:00", end_time: "23:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }
        ]
      },
      {
        name: "TeleOro",
        code: "C13",
        programs: [
          { name: "Noticias 13", start_time: "18:00", end_time: "19:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Contigo Siempre", start_time: "20:00", end_time: "21:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Mi Gente", start_time: "21:00", end_time: "22:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }
        ]
      },
      {
        name: "ABC Puerto Rico",
        code: "C05",
        programs: [
          { name: "Pinto Final", start_time: "18:00", end_time: "18:30", days: ["Tue"] },
          { name: "Prime Time", start_time: "19:00", end_time: "20:00", days: ["Tue"] }
        ]
      },
      {
        name: "Canal 32",
        code: "C32",
        programs: [
          { name: "La Movida", start_time: "14:00", end_time: "15:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }
        ]
      }
    ];
    
    // Get existing channels if we need to seed programs but not channels
    let existingChannelsData = [];
    if (!shouldSeedChannels && shouldSeedPrograms) {
      const { data } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('type', 'tv');
      
      existingChannelsData = data || [];
    }
    
    // Build a map of channel names to IDs for easy lookup
    const channelMap = {};
    existingChannelsData.forEach(channel => {
      channelMap[channel.name] = channel.id;
    });
    
    // Create channels if needed
    if (shouldSeedChannels) {
      for (const channelData of channelsData) {
        // Create channel
        const { data: channel } = await supabase
          .from('media_outlets')
          .insert([
            { name: channelData.name, type: 'tv', folder: channelData.code }
          ])
          .select()
          .single();
        
        if (channel) {
          channelMap[channel.name] = channel.id;
        }
      }
    }
    
    // Process programs if needed
    if (shouldSeedPrograms) {
      // Start with a clean slate for programs
      const programsToAdd = [];
      
      // Process all channel data
      for (const channelData of channelsData) {
        const channelId = channelMap[channelData.name];
        
        // Skip if we couldn't find the channel
        if (!channelId) continue;
        
        // Add programs for this channel
        if (channelData.programs && channelData.programs.length > 0) {
          channelData.programs.forEach(prog => {
            programsToAdd.push({
              id: crypto.randomUUID(),
              name: prog.name,
              channel_id: channelId,
              start_time: prog.start_time,
              end_time: prog.end_time,
              days: prog.days,
              created_at: new Date().toISOString()
            });
          });
        }
      }
      
      // Save all programs to localStorage
      saveStoredPrograms(programsToAdd);
      
      // Update the data version
      localStorage.setItem('tv_data_version', CURRENT_DATA_VERSION);
    }
    
    console.log('TV data seeded successfully');
  } catch (error) {
    console.error('Error seeding TV data:', error);
    throw error;
  }
}

// Helper to completely reset TV data
export async function resetTvData() {
  try {
    // Clear programs from localStorage
    localStorage.removeItem('tv_programs');
    localStorage.removeItem('tv_data_version');
    
    // Force refresh the data
    await seedTvData(true);
    
    return true;
  } catch (error) {
    console.error('Error resetting TV data:', error);
    throw error;
  }
}
