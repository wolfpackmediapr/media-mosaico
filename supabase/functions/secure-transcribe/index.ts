
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
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000; // milliseconds

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
    
    // Validate required fields
    const file = formData.get('file');
    const userId = formData.get('userId');

    if (!file) {
      console.error('Missing required file');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      console.error('Missing required user ID');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file is actual File object
    if (!(file instanceof File)) {
      console.error('File is not a valid File object');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log file details for debugging
    console.log(`File details: name=${file.name}, size=${file.size} bytes, type=${file.type}`);
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.error(`File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE_BYTES} bytes)`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate file type
    if (!VALID_MIME_TYPES.includes(file.type)) {
      console.error(`Invalid file type: ${file.type}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'File type not supported. Please upload an MP3, WAV, OGG, or MP4 file.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if file has actual content
    if (file.size === 0) {
      console.error('File is empty');
      return new Response(
        JSON.stringify({ success: false, error: 'The uploaded file is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`File validated: ${file.name}, ${file.size} bytes, ${file.type}`);

    // Verify OpenAI API key exists
    console.log('Processing file with OpenAI Whisper API');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    let lastError = null;
    
    while (retries <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retries + 1}/${MAX_RETRIES + 1} to call Whisper API`);
        
        response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIKey}`,
          },
          body: whisperFormData,
          // Add signal with timeout to prevent hanging requests
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        if (response.status === 429) {
          console.warn('Rate limit exceeded, will retry after delay');
          lastError = new Error('OpenAI API rate limit exceeded');
          await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * Math.pow(2, retries)));
          retries++;
          continue;
        }
        
        if (response.ok) {
          console.log('OpenAI API response received successfully');
          break;
        } else {
          // Try to get error message from response
          let errorText = '';
          try {
            const errorData = await response.json();
            errorText = JSON.stringify(errorData);
          } catch (e) {
            errorText = await response.text();
          }
          
          lastError = new Error(`OpenAI API error: ${errorText}`);
          console.error(`OpenAI API error (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, errorText);
          
          // Check for specific error types that we can't recover from
          if (errorText.includes('Invalid file format') || 
              errorText.includes('audio file is too large') || 
              response.status === 400) {
            console.error('Fatal error detected by OpenAI, aborting retries');
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `OpenAI API cannot process this file: ${errorText}` 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          // If we've reached max retries, throw the error
          if (retries === MAX_RETRIES) {
            throw lastError;
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * Math.pow(2, retries)));
          retries++;
        }
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`Network error (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, fetchError);
        
        // If we've reached max retries, throw the error
        if (retries === MAX_RETRIES) {
          throw fetchError;
        }
        
        // Wait before retrying
        await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * Math.pow(2, retries)));
        retries++;
      }
    }

    // Parse response
    const responseBody = await response.json().catch(error => {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Invalid response from OpenAI API');
    });
    
    // Validate the response has expected fields
    if (!responseBody || !responseBody.text) {
      console.error('Invalid or empty response from OpenAI:', responseBody);
      throw new Error('Invalid response from OpenAI API');
    }
    
    const result = responseBody;
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
        // Continue execution even if DB insert fails - we'll return the transcription anyway
      } else {
        dbTranscriptionId = insertData.id;
        console.log('Transcription saved to database with ID:', dbTranscriptionId);
      }
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      // Continue execution even if DB insert fails - we'll return the transcription anyway
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
    
    // Determine status code based on error
    let statusCode = 500;
    const errorMessage = error.message || 'Unknown error occurred';
    
    // Check for client errors
    if (
      errorMessage.includes('File size exceeds') ||
      errorMessage.includes('File type not supported') ||
      errorMessage.includes('Invalid file format')
    ) {
      statusCode = 400; // Bad request
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error.stack
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
