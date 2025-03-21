
import { supabase } from "@/integrations/supabase/client";
import { ChannelType } from "./types";

// Channel Services
export async function fetchChannels(): Promise<ChannelType[]> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .select('*')
      .eq('type', 'tv')
      .order('name');

    if (error) throw error;
    
    // Map media_outlets structure to ChannelType
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      code: item.folder || '',
    }));
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
}

export async function createChannel(channel: Omit<ChannelType, 'id'>): Promise<ChannelType> {
  try {
    // Create a media outlet record for this channel
    const { data, error } = await supabase
      .from('media_outlets')
      .insert([
        {
          name: channel.name,
          type: 'tv',
          folder: channel.code
        }
      ])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after creating channel');
    }
    
    // Return in the expected format
    return {
      id: data[0].id,
      name: data[0].name,
      code: data[0].folder || '',
    };
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
}

export async function updateChannel(channel: ChannelType): Promise<void> {
  try {
    const { error } = await supabase
      .from('media_outlets')
      .update({
        name: channel.name,
        folder: channel.code
      })
      .eq('id', channel.id)
      .eq('type', 'tv');

    if (error) throw error;
  } catch (error) {
    console.error('Error updating channel:', error);
    throw error;
  }
}

export async function deleteChannel(id: string): Promise<void> {
  try {
    // First get the channel details
    const { data: channel } = await supabase
      .from('media_outlets')
      .select('*')
      .eq('id', id)
      .eq('type', 'tv')
      .single();
      
    if (!channel) throw new Error('Channel not found');
    
    // Delete the channel itself
    const { error } = await supabase
      .from('media_outlets')
      .delete()
      .eq('id', id)
      .eq('type', 'tv');

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting channel:', error);
    throw error;
  }
}
