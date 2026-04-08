
export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  geminiApiKey: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Support dual key rotation: accept either key
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY_TV') || Deno.env.get('GOOGLE_GEMINI_API_KEY_TV_2');
  const hasSecondKey = !!Deno.env.get('GOOGLE_GEMINI_API_KEY_TV_2');
  
  console.log('[process-tv-with-gemini] Environment validation:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseServiceKey: !!supabaseServiceKey,
    hasGeminiApiKey: !!geminiApiKey,
    hasSecondGeminiKey: hasSecondKey,
    totalGeminiKeys: (Deno.env.get('GOOGLE_GEMINI_API_KEY_TV') ? 1 : 0) + (hasSecondKey ? 1 : 0),
    supabaseUrlLength: supabaseUrl?.length || 0,
    geminiKeyLength: geminiApiKey?.length || 0
  });
  
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!geminiApiKey) throw new Error('No Gemini API keys configured (need GOOGLE_GEMINI_API_KEY_TV or GOOGLE_GEMINI_API_KEY_TV_2)');
  
  return { supabaseUrl, supabaseServiceKey, geminiApiKey };
}
