
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const VALID_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting secure-transcribe process...');
    
    // Get the form data
    const formData = await req.formData().catch(error => {
      console.error('Error parsing form data:', error);
      throw new Error('Invalid form data');
    });
    
    const file = formData.get('file');
    const userId = formData.get('userId');

    if (!file || !userId) {
      console.error('Missing required data:', { hasFile: !!file, hasUserId: !!userId });
      throw new Error('Missing required file or user ID');
    }

    // Validate file is actual File object
    if (!(file instanceof File)) {
      console.error('File is not a valid File object');
      throw new Error('Invalid file format');
    }

    // Log file details for debugging
    console.log(`File details: name=${file.name}, size=${file.size} bytes, type=${file.type}`);
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.error(`File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE_BYTES} bytes)`);
      throw new Error(`File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`);
    }
    
    // Validate file type
    if (!VALID_MIME_TYPES.includes(file.type)) {
      console.error(`Invalid file type: ${file.type}`);
      throw new Error('File type not supported. Please upload an MP3, WAV, OGG, or MP4 file.');
    }

    // Check if file has actual content
    if (file.size === 0) {
      console.error('File is empty');
      throw new Error('The uploaded file is empty');
    }
    
    console.log(`File validated: ${file.name}, ${file.size} bytes, ${file.type}`);

    // Verify OpenAI API key exists
    console.log('Processing file with OpenAI Whisper API');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    // Create a new FormData for OpenAI
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'es');
    whisperFormData.append('response_format', 'verbose_json');

    // Send to OpenAI Whisper with retries
    let response;
    let retries = 0;
    const maxRetries = 2;
    let lastError = null;
    
    while (retries <= maxRetries) {
      try {
        console.log(`Attempt ${retries + 1}/${maxRetries + 1} to call Whisper API`);
        
        response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIKey}`,
          },
          body: whisperFormData,
        });
        
        if (response.ok) {
          console.log('OpenAI API response received successfully');
          break;
        } else {
          const errorText = await response.text();
          lastError = new Error(`OpenAI API error: ${errorText}`);
          console.error(`OpenAI API error (attempt ${retries + 1}/${maxRetries + 1}):`, errorText);
          
          // Check for specific error types that we can't recover from
          if (errorText.includes('Invalid file format')) {
            console.error('Invalid file format detected by OpenAI, aborting retries');
            throw new Error(`OpenAI API cannot process this file format. Please convert to a supported audio format.`);
          }
          
          // If we've reached max retries, throw the error
          if (retries === maxRetries) {
            throw lastError;
          }
          
          // Wait before retrying
          await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
          retries++;
        }
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`Network error (attempt ${retries + 1}/${maxRetries + 1}):`, fetchError);
        
        // If we've reached max retries, throw the error
        if (retries === maxRetries) {
          throw fetchError;
        }
        
        // Wait before retrying
        await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
        retries++;
      }
    }

    // Parse response
    const result = await response.json();
    console.log('Processing OpenAI response');
    
    // Transform segments into word-like format for consistency
    const segments = result.segments || [];
    const words = segments.map(segment => ({
      text: segment.text,
      start: Math.round(segment.start * 1000), // Convert seconds to ms
      end: Math.round(segment.end * 1000),     // Convert seconds to ms
      confidence: segment.confidence
    }));

    // Calculate audio duration from segments
    const audioDuration = segments.length > 0 
      ? segments[segments.length - 1].end 
      : 0;

    // Store the transcription in the database
    let dbTranscriptionId = null;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase credentials not found');
        throw new Error('Database credentials not configured');
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: insertData, error: insertError } = await supabase
        .from('radio_transcriptions')
        .insert({
          user_id: userId,
          transcription_text: result.text,
          metadata: {
            audio_duration: audioDuration,
            has_segment_timestamps: true,
            language_code: 'es',
            model: 'whisper-1',
            fallback: true,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
          }
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error saving to database:', insertError);
      } else {
        dbTranscriptionId = insertData.id;
        console.log('Transcription saved to database with ID:', dbTranscriptionId);
      }
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: result.text,
        words: words,
        segments: segments,
        audio_duration: audioDuration,
        db_transcription_id: dbTranscriptionId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in secure-transcribe function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
