
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";
import { uuid } from "@/lib/utils";
import { fetchChannels } from "../channelService";
import { fetchPrograms } from "../programService";
import { toast } from "sonner";

export const seedTvRates = async (): Promise<void> => {
  try {
    // Clear existing rates first
    const { error: deleteError } = await supabase
      .from('tv_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Safe deletion of all records
    
    if (deleteError) {
      console.error("Error deleting existing TV rates:", deleteError);
      throw deleteError;
    }
    
    // Fetch real channels and programs to use their IDs
    const channels = await fetchChannels();
    const programs = await fetchPrograms();
    
    if (channels.length === 0 || programs.length === 0) {
      console.error("Cannot seed rates: No channels or programs available");
      throw new Error("No channels or programs available");
    }
    
    // Create rates for each channel/program combination
    const rates: Partial<TvRateType>[] = [];
    
    // Function to find a program in a specific channel
    const findProgramInChannel = (channelId: string, programNamePattern: string) => {
      return programs.find(p => 
        p.channel_id === channelId && 
        p.name.toLowerCase().includes(programNamePattern.toLowerCase())
      );
    };
    
    // Helper to find a channel by name pattern
    const findChannelByName = (namePattern: string) => {
      return channels.find(c => 
        c.name.toLowerCase().includes(namePattern.toLowerCase())
      );
    };
    
    // Utility function to create a rate entry
    const createRate = (
      channelId: string,
      programId: string,
      days: string[],
      startTime: string,
      endTime: string,
      rate15s: number,
      rate30s: number,
      rate45s: number,
      rate60s: number
    ): Partial<TvRateType> => {
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
    
    // WAPA TV rates
    const wapaChannel = findChannelByName("WAPA");
    if (wapaChannel) {
      // Noticias (morning)
      const noticiasProgram = findProgramInChannel(wapaChannel.id, "Noticias");
      if (noticiasProgram) {
        rates.push(createRate(
          wapaChannel.id,
          noticiasProgram.id,
          ["Mon", "Tue", "Wed", "Thu", "Fri"],
          "06:00",
          "08:00",
          1200,
          2000,
          2800,
          3500
        ));
      }
      
      // Daytime programming
      const daytimeProgram = findProgramInChannel(wapaChannel.id, "Programa de la Tarde");
      if (daytimeProgram) {
        rates.push(createRate(
          wapaChannel.id,
          daytimeProgram.id,
          ["Mon", "Tue", "Wed", "Thu", "Fri"],
          "13:00",
          "15:00",
          900,
          1500,
          2100,
          2700
        ));
      }
    }
    
    // Telemundo rates
    const telemundoChannel = findChannelByName("Telemundo");
    if (telemundoChannel) {
      // Telenovelas (prime time)
      const telenovelasProgram = findProgramInChannel(telemundoChannel.id, "Telenovela");
      if (telenovelasProgram) {
        rates.push(createRate(
          telemundoChannel.id,
          telenovelasProgram.id,
          ["Mon", "Tue", "Wed", "Thu", "Fri"],
          "20:00",
          "22:00",
          1500,
          2500,
          3200,
          4000
        ));
      }
      
      // Weekend movies
      const moviesProgram = findProgramInChannel(telemundoChannel.id, "Películas");
      if (moviesProgram) {
        rates.push(createRate(
          telemundoChannel.id,
          moviesProgram.id,
          ["Sat", "Sun"],
          "19:00",
          "21:00",
          1400,
          2300,
          3000,
          3800
        ));
      }
    }
    
    // Insert the seed rates into the database
    const { error } = await supabase
      .from('tv_rates')
      .insert(rates);
    
    if (error) {
      console.error("Error seeding TV rates:", error);
      throw error;
    }
    
    console.log(`Successfully seeded ${rates.length} TV rates`);
    
  } catch (error) {
    console.error("Failed to seed TV rates:", error);
    throw error;
  }
};
