
import { supabase } from "@/integrations/supabase/client";

// Utility function to seed initial radio rates data
export const seedInitialRates = async (): Promise<void> => {
  try {
    // Check if there are already rates in the table
    const { count, error: countError } = await supabase
      .from('radio_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Error checking radio rates count:", countError);
      return;
    }

    // Only seed if there are no rates yet
    if (count === 0) {
      console.log("Seeding initial radio rates...");
      
      // Get some stations and programs to use in the seed data
      const { data: stations, error: stationsError } = await supabase
        .from('media_outlets')
        .select('id, name')
        .eq('type', 'radio')
        .limit(5);
        
      if (stationsError) {
        console.error("Error fetching stations for seeding:", stationsError);
        return;
      }
      
      if (!stations || stations.length === 0) {
        console.warn("No stations found for seeding rates");
        return;
      }
      
      const { data: programs, error: programsError } = await supabase
        .from('radio_programs')
        .select('id, name, station_id')
        .limit(10);
        
      if (programsError) {
        console.error("Error fetching programs for seeding:", programsError);
        return;
      }
      
      if (!programs || programs.length === 0) {
        console.warn("No programs found for seeding rates");
        return;
      }
      
      // Create sample rates data
      const sampleRates = programs.map(program => {
        const station = stations.find(s => s.id === program.station_id);
        
        return {
          station_id: program.station_id,
          program_id: program.id,
          days: ['L', 'M', 'X', 'J', 'V'],
          start_time: '07:00:00',
          end_time: '09:00:00',
          rate_15s: Math.floor(Math.random() * 100) + 50,
          rate_30s: Math.floor(Math.random() * 200) + 100,
          rate_45s: Math.floor(Math.random() * 300) + 150,
          rate_60s: Math.floor(Math.random() * 400) + 200
        };
      });
      
      // Insert the sample rates
      const { error: insertError } = await supabase
        .from('radio_rates')
        .insert(sampleRates);
        
      if (insertError) {
        console.error("Error seeding initial radio rates:", insertError);
        return;
      }
      
      console.log("Successfully seeded initial radio rates");
    } else {
      console.log("Radio rates table already contains data, skipping seed");
    }
  } catch (error) {
    console.error("Error in seedInitialRates:", error);
  }
};
