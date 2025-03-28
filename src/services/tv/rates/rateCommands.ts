
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";

// Function to create a new rate
export const createRate = async (
  rateData: Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>
): Promise<TvRateType> => {
  try {
    const { data, error } = await supabase
      .from('tv_rates')
      .insert(rateData)
      .select()
      .single();

    if (error) {
      console.error("Error creating TV rate:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createRate:", error);
    throw error;
  }
};

// Function to update an existing rate
export const updateRate = async (
  rateData: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>
): Promise<void> => {
  try {
    // Create a new object without the channel_name and program_name properties
    const { id, channel_id, program_id, days, start_time, end_time, rate_15s, rate_30s, rate_45s, rate_60s } = rateData;
    
    const { error } = await supabase
      .from('tv_rates')
      .update({ 
        channel_id, 
        program_id, 
        days, 
        start_time, 
        end_time, 
        rate_15s, 
        rate_30s, 
        rate_45s, 
        rate_60s 
      })
      .eq('id', id);

    if (error) {
      console.error("Error updating TV rate:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in updateRate:", error);
    throw error;
  }
};

// Function to delete a rate
export const deleteRate = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tv_rates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting TV rate:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteRate:", error);
    throw error;
  }
};
