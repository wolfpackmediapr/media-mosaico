
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request received');
    const { videoPath } = await req.json();
    console.log('Video path received:', videoPath);

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First check if the file exists in the bucket
    const { data: fileExists, error: fileCheckError } = await supabase
      .storage
      .from('media')
      .list(videoPath.split('/')[0], {
        limit: 1,
        offset: 0,
        search: videoPath.split('/')[1]
      });

    if (fileCheckError) {
      console.error('Error checking file existence:', fileCheckError);
      throw new Error(`Failed to check file existence: ${fileCheckError.message}`);
    }

    if (!fileExists || fileExists.length === 0) {
      console.error('File not found in storage:', videoPath);
      throw new Error('File not found in storage');
    }

    console.log('File exists in storage, generating signed URL');

    // Generate signed URL for the file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 60);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }

    if (!signedUrlData?.signedUrl) {
      throw new Error('No signed URL generated');
    }

    console.log('Signed URL generated successfully');

    // Download the file using the signed URL
    console.log('Downloading file from signed URL');
    const fileResponse = await fetch(signedUrlData.signedUrl);
    
    if (!fileResponse.ok) {
      console.error('File download failed:', fileResponse.status, fileResponse.statusText);
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileData = await fileResponse.blob();
    console.log('File downloaded successfully, size:', fileData.size);

    // First, we'll use OpenAI Whisper for the transcription
    const formData = new FormData();
    formData.append('file', fileData, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'es');

    console.log('Calling Whisper API');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    console.log('Transcription completed successfully');

    // Now, use AssemblyAI to identify news segments within the transcript
    console.log('Processing transcript with AssemblyAI for news segments');
    
    // Create AssemblyAI transcript using the audio file
    const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: signedUrlData.signedUrl,
        auto_chapters: true,
        speaker_labels: true,
        entity_detection: true,
        auto_highlights: true,
        summarization: true,
        summary_type: 'paragraph',
        summary_model: 'conversational',
        topic_detection: true,      // Enable topic detection
        iab_categories: true,       // Enable IAB category detection
        sentiment_analysis: true,   // Enable sentiment analysis
        language_detection: true,   // Auto-detect language
        content_safety: true,       // Flag potentially unsafe content
        filter_profanity: false     // Don't filter profanity to keep original content
      })
    });

    if (!assemblyResponse.ok) {
      console.error('AssemblyAI creation error:', await assemblyResponse.text());
      // Still return the Whisper result if AssemblyAI fails
      return new Response(
        JSON.stringify({ 
          text: whisperResult.text,
          segments: [{ text: whisperResult.text, start: 0, end: 0 }] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assemblyJob = await assemblyResponse.json();
    console.log('AssemblyAI job created:', assemblyJob.id);

    // Poll until the transcript is ready
    let transcriptResult;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s * 60)
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const checkResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${assemblyJob.id}`, {
        headers: {
          'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
        }
      });
      
      if (!checkResponse.ok) {
        console.error('AssemblyAI check error:', await checkResponse.text());
        break;
      }
      
      transcriptResult = await checkResponse.json();
      
      if (transcriptResult.status === 'completed') {
        console.log('AssemblyAI processing completed');
        break;
      } else if (transcriptResult.status === 'error') {
        console.error('AssemblyAI processing error:', transcriptResult.error);
        break;
      }
      
      console.log(`Waiting for AssemblyAI processing... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
    }

    // Create news segments with enhanced structure
    const newsSegments = [];
    
    if (transcriptResult?.status === 'completed') {
      // Store the full AssemblyAI analysis in the database
      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({ 
          transcription_text: whisperResult.text,
          assembly_chapters: transcriptResult.chapters || null,
          assembly_entities: transcriptResult.entities || null,
          assembly_key_phrases: transcriptResult.auto_highlights_result || null,
          assembly_summary: transcriptResult.summary || null,
          assembly_topics: transcriptResult.iab_categories_result?.results || null,
          status: 'completed',
          progress: 100
        })
        .eq('original_file_path', videoPath);

      if (updateError) {
        console.error('Error updating transcription record:', updateError);
      }
      
      // Process segments by priority order
      
      // Priority 1: Use chapters as primary segments if available
      if (transcriptResult.chapters && transcriptResult.chapters.length > 0) {
        console.log(`Using ${transcriptResult.chapters.length} chapters as primary news segments`);
        newsSegments.push(...transcriptResult.chapters.map((chapter, index) => ({
          headline: chapter.headline || chapter.gist,
          text: chapter.summary || chapter.gist,
          start: chapter.start,
          end: chapter.end,
          segment_number: index + 1,
          segment_title: chapter.headline || chapter.gist || `Segmento ${index + 1}`,
          timestamp_start: formatMilliseconds(chapter.start),
          timestamp_end: formatMilliseconds(chapter.end)
        })));
      } 
      // Priority 2: If no chapters, use topic transitions
      else if (transcriptResult.iab_categories_result?.results && transcriptResult.iab_categories_result.results.length > 0) {
        console.log(`Using ${transcriptResult.iab_categories_result.results.length} topic transitions`);
        
        // Group by topic - find segments where the top category changes
        const topicSegments = [];
        let currentTopic = null;
        let startTime = 0;
        let currentText = "";
        
        transcriptResult.iab_categories_result.results.forEach((item, index) => {
          // Get top category for this segment
          const topCategory = item.labels && item.labels.length > 0 ? 
            item.labels.sort((a, b) => b.relevance - a.relevance)[0].label : null;
            
          if (topCategory !== currentTopic || index === 0) {
            // Start new segment if topic changes
            if (index > 0) {
              topicSegments.push({
                topic: currentTopic,
                text: currentText,
                start: startTime,
                end: item.timestamp.start
              });
            }
            
            currentTopic = topCategory;
            startTime = item.timestamp.start;
            currentText = item.text;
          } else {
            // Continue current segment
            currentText += " " + item.text;
          }
          
          // Add final segment
          if (index === transcriptResult.iab_categories_result.results.length - 1) {
            topicSegments.push({
              topic: currentTopic,
              text: currentText,
              start: startTime,
              end: item.timestamp.end
            });
          }
        });
        
        // Convert topic segments to news segments
        newsSegments.push(...topicSegments.map((segment, index) => ({
          headline: segment.topic || `Segmento ${index + 1}`,
          text: segment.text,
          start: segment.start,
          end: segment.end,
          segment_number: index + 1,
          segment_title: segment.topic || `Segmento ${index + 1}`,
          timestamp_start: formatMilliseconds(segment.start),
          timestamp_end: formatMilliseconds(segment.end)
        })));
      }
      // Priority 3: If no topics, use speaker changes
      else if (transcriptResult.utterances && transcriptResult.utterances.length > 0) {
        console.log(`Using ${transcriptResult.utterances.length} speaker transitions`);
        newsSegments.push(...transcriptResult.utterances.map((utterance, index) => {
          // Try to identify questions and answers for interview segments
          const isQuestion = utterance.text.trim().endsWith('?');
          const segmentTitle = isQuestion 
            ? `Pregunta: ${utterance.text.substring(0, 30)}...` 
            : `Locutor ${utterance.speaker}`;
            
          return {
            headline: segmentTitle,
            text: utterance.text,
            start: utterance.start,
            end: utterance.end,
            segment_number: index + 1,
            segment_title: segmentTitle,
            timestamp_start: formatMilliseconds(utterance.start),
            timestamp_end: formatMilliseconds(utterance.end)
          };
        }));
      }
      
      // If we have entities, we can enhance segment titles
      if (transcriptResult.entities && transcriptResult.entities.length > 0 && newsSegments.length > 0) {
        // Group entities by segment
        newsSegments.forEach(segment => {
          const segmentEntities = transcriptResult.entities.filter(entity => 
            entity.start >= segment.start && entity.end <= segment.end
          );
          
          // Use entities to enhance segment titles if available
          if (segmentEntities.length > 0) {
            // Group by entity type and count occurrences
            const entityCounts = {};
            segmentEntities.forEach(entity => {
              if (!entityCounts[entity.text]) {
                entityCounts[entity.text] = {
                  count: 0,
                  type: entity.entity_type
                };
              }
              entityCounts[entity.text].count++;
            });
            
            // Find most frequently mentioned entity
            const topEntities = Object.entries(entityCounts)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 2)
              .map(entry => entry[0]);
              
            if (topEntities.length > 0) {
              // Only update if current title is generic
              if (segment.segment_title.startsWith('Segmento') || segment.segment_title.startsWith('Locutor')) {
                segment.segment_title = topEntities.join(', ');
                segment.headline = topEntities.join(', ');
              }
            }
          }
        });
      }
    }

    // If no segments were identified, use the full transcript as a single segment
    if (newsSegments.length === 0) {
      console.log('No segments identified, using full transcript as single segment');
      newsSegments.push({
        headline: 'Transcripción completa',
        text: whisperResult.text,
        start: 0,
        end: 0,
        segment_number: 1,
        segment_title: 'Transcripción completa',
        timestamp_start: '00:00:00',
        timestamp_end: '00:00:00'
      });
    }

    console.log(`Returning ${newsSegments.length} news segments`);
    
    return new Response(
      JSON.stringify({ 
        text: whisperResult.text,
        segments: newsSegments,
        assemblyId: assemblyJob.id,
        analysis: {
          chapters: transcriptResult?.chapters || [],
          content_safety_labels: transcriptResult?.content_safety_labels || null,
          sentiment_analysis_results: transcriptResult?.sentiment_analysis_results || null,
          entities: transcriptResult?.entities || null,
          iab_categories_result: transcriptResult?.iab_categories_result || null,
          auto_highlights_result: transcriptResult?.auto_highlights_result || null,
          summary: transcriptResult?.summary || null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to format milliseconds into MM:SS format
function formatMilliseconds(ms) {
  if (!ms) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
