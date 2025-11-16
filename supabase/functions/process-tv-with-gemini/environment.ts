
export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  geminiApiKey: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY_TV');
  
  console.log('[process-tv-with-gemini] Environment validation:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseServiceKey: !!supabaseServiceKey,
    hasGeminiApiKey: !!geminiApiKey,
    supabaseUrlLength: supabaseUrl?.length || 0,
    geminiKeyLength: geminiApiKey?.length || 0
  });
  
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!geminiApiKey) throw new Error('GOOGLE_GEMINI_API_KEY_TV not configured');
  
  return { supabaseUrl, supabaseServiceKey, geminiApiKey };
}
