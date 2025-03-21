
import { supabase } from "@/integrations/supabase/client";

// Types
export interface ChannelType {
  id: string;
  name: string;
  code: string;
  created_at?: string;
}

export interface ProgramType {
  id: string;
  name: string;
  channel_id: string;
  start_time: string;
  end_time: string;
  days: string[];
  created_at?: string;
}

// Channel Services
export async function fetchChannels(): Promise<ChannelType[]> {
  try {
    const { data, error } = await supabase
      .from('tv_channels')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
}

export async function createChannel(channel: Omit<ChannelType, 'id'>): Promise<ChannelType> {
  try {
    const { data, error } = await supabase
      .from('tv_channels')
      .insert([channel])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after creating channel');
    }
    
    // Also create a media outlet record for this channel
    await supabase
      .from('media_outlets')
      .insert([
        {
          name: channel.name,
          type: 'tv',
          folder: channel.code
        }
      ]);
      
    return data[0];
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
}

export async function updateChannel(channel: ChannelType): Promise<void> {
  try {
    const { error } = await supabase
      .from('tv_channels')
      .update({
        name: channel.name,
        code: channel.code
      })
      .eq('id', channel.id);

    if (error) throw error;
    
    // Also update the corresponding media outlet
    // First, find the media outlet with the same name in TV type
    const { data: mediaOutlets } = await supabase
      .from('media_outlets')
      .select('*')
      .eq('type', 'tv')
      .ilike('name', `%${channel.name.replace(/ /g, '%')}%`);
    
    if (mediaOutlets && mediaOutlets.length > 0) {
      await supabase
        .from('media_outlets')
        .update({
          name: channel.name,
          folder: channel.code
        })
        .eq('id', mediaOutlets[0].id);
    }
  } catch (error) {
    console.error('Error updating channel:', error);
    throw error;
  }
}

export async function deleteChannel(id: string): Promise<void> {
  try {
    // First get the channel details
    const { data: channel } = await supabase
      .from('tv_channels')
      .select('*')
      .eq('id', id)
      .single();
      
    if (!channel) throw new Error('Channel not found');
    
    // Delete related programs first
    const { error: programsError } = await supabase
      .from('tv_programs')
      .delete()
      .eq('channel_id', id);
    
    if (programsError) throw programsError;
    
    // Delete the channel itself
    const { error } = await supabase
      .from('tv_channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Also try to delete the corresponding media outlet
    const { data: mediaOutlets } = await supabase
      .from('media_outlets')
      .select('*')
      .eq('type', 'tv')
      .ilike('name', `%${channel.name.replace(/ /g, '%')}%`);
    
    if (mediaOutlets && mediaOutlets.length > 0) {
      await supabase
        .from('media_outlets')
        .delete()
        .eq('id', mediaOutlets[0].id);
    }
  } catch (error) {
    console.error('Error deleting channel:', error);
    throw error;
  }
}

// Program Services
export async function fetchPrograms(): Promise<ProgramType[]> {
  try {
    const { data, error } = await supabase
      .from('tv_programs')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching programs:', error);
    throw error;
  }
}

export async function createProgram(program: Omit<ProgramType, 'id'>): Promise<ProgramType> {
  try {
    const { data, error } = await supabase
      .from('tv_programs')
      .insert([program])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after creating program');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error creating program:', error);
    throw error;
  }
}

export async function updateProgram(program: ProgramType): Promise<void> {
  try {
    const { error } = await supabase
      .from('tv_programs')
      .update({
        name: program.name,
        channel_id: program.channel_id,
        start_time: program.start_time,
        end_time: program.end_time,
        days: program.days
      })
      .eq('id', program.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating program:', error);
    throw error;
  }
}

export async function deleteProgram(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tv_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting program:', error);
    throw error;
  }
}

// Seed function to initialize the database with the provided TV data
export async function seedTvData() {
  try {
    // First check if we already have data
    const { data: existingChannels } = await supabase
      .from('tv_channels')
      .select('count')
      .single();
      
    if (existingChannels && existingChannels.count > 0) {
      console.log('TV data already seeded');
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
    
    // Create channels and programs
    for (const channelData of channelsData) {
      // Create channel
      const { data: channel } = await supabase
        .from('tv_channels')
        .insert([
          { name: channelData.name, code: channelData.code }
        ])
        .select()
        .single();
      
      if (!channel) continue;
      
      // Create media outlet for channel
      await supabase
        .from('media_outlets')
        .insert([
          { 
            name: channelData.name, 
            type: 'tv',
            folder: channelData.code
          }
        ]);
      
      // Create programs for this channel
      if (channelData.programs.length > 0) {
        const programsToInsert = channelData.programs.map(prog => ({
          name: prog.name,
          channel_id: channel.id,
          start_time: prog.start_time,
          end_time: prog.end_time,
          days: prog.days
        }));
        
        await supabase
          .from('tv_programs')
          .insert(programsToInsert);
      }
    }
    
    console.log('TV data seeded successfully');
  } catch (error) {
    console.error('Error seeding TV data:', error);
    throw error;
  }
}
