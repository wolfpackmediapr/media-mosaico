
import { supabase } from "@/integrations/supabase/client";
import { saveStoredPrograms, getStoredPrograms } from "./utils";

// Seed function to initialize the database with the provided TV data
export async function seedTvData() {
  try {
    // First check if we already have data
    const { data: existingChannels } = await supabase
      .from('media_outlets')
      .select('count')
      .eq('type', 'tv')
      .single();
      
    if (existingChannels && existingChannels.count > 0) {
      console.log('TV channels already seeded');
      return; // Data already exists, don't seed
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
          { name: "Telenoticias 11pm", start_time: "23:00", end_time: "23:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Rayos X", start_time: "22:00", end_time: "23:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Telenoticias edición sábado", start_time: "22:00", end_time: "23:00", days: ["Sat"] },
          { name: "Telenoticias edición domingo", start_time: "17:00", end_time: "18:00", days: ["Sun"] }
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
          { name: "Noticentro Edición Domingo", start_time: "17:00", end_time: "18:00", days: ["Sun"] }
        ]
      },
      {
        name: "TeleOnce",
        code: "C11",
        programs: [
          { name: "Informe 940", start_time: "06:00", end_time: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Un buen Día", start_time: "08:00", end_time: "10:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Notiséis (AM)", start_time: "10:30", end_time: "11:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "El Mediodía", start_time: "12:30", end_time: "14:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Notiséis (PM)", start_time: "18:00", end_time: "19:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Aquí estamos", start_time: "19:00", end_time: "20:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
          { name: "Al Gusto", start_time: "20:00", end_time: "21:00", days: ["Wed"] },
          { name: "Homenaje", start_time: "20:00", end_time: "21:00", days: ["Tue"] }
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
        programs: []
      },
      {
        name: "Canal 32",
        code: "C32",
        programs: []
      }
    ];
    
    // Create channels
    for (const channelData of channelsData) {
      // Create channel
      const { data: channel } = await supabase
        .from('media_outlets')
        .insert([
          { name: channelData.name, type: 'tv', folder: channelData.code }
        ])
        .select()
        .single();
      
      if (!channel) continue;
      
      // Save programs to local storage as a temporary solution
      if (channelData.programs.length > 0) {
        const storedPrograms = getStoredPrograms();
        
        const programsToAdd = channelData.programs.map(prog => ({
          id: crypto.randomUUID(),
          name: prog.name,
          channel_id: channel.id,
          start_time: prog.start_time,
          end_time: prog.end_time,
          days: prog.days,
          created_at: new Date().toISOString()
        }));
        
        saveStoredPrograms([...storedPrograms, ...programsToAdd]);
      }
    }
    
    console.log('TV data seeded successfully');
  } catch (error) {
    console.error('Error seeding TV data:', error);
    throw error;
  }
}
