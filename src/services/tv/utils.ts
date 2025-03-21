
import { supabase } from "@/integrations/supabase/client";

// Check if tv_channels table exists
export async function ensureTablesExist() {
  // Check if tv_channels table exists by checking for TV media outlets
  const { error: channelsCheckError } = await supabase
    .from('media_outlets')
    .select('count')
    .eq('type', 'tv')
    .limit(1);

  // If there's an error or no channels table, create it
  if (channelsCheckError) {
    console.error('Error checking tv channels in media_outlets:', channelsCheckError);
  }
}

// Helper function to get programs from localStorage
export function getStoredPrograms(): any[] {
  return JSON.parse(localStorage.getItem('tv_programs') || '[]');
}

// Helper function to save programs to localStorage
export function saveStoredPrograms(programs: any[]): void {
  localStorage.setItem('tv_programs', JSON.stringify(programs));
}
