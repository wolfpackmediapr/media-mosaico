
import { ParsedAnalysis } from './analysis-parser.ts';

export async function updateTranscriptionRecord(
  supabase: any, 
  transcriptionId: string, 
  parsedAnalysis: ParsedAnalysis
): Promise<void> {
  try {
    console.log('[process-tv-with-gemini] Updating transcription record:', transcriptionId);
    
    const { error: updateError } = await supabase
      .from('tv_transcriptions')
      .update({
        transcription_text: parsedAnalysis.transcription || 'Transcripción procesada',
        status: 'completed',
        progress: 100,
        summary: parsedAnalysis.summary || 'Análisis completado',
        keywords: parsedAnalysis.keywords || [],
        analysis_summary: parsedAnalysis.summary,
        analysis_quien: parsedAnalysis.analysis?.who,
        analysis_que: parsedAnalysis.analysis?.what,
        analysis_cuando: parsedAnalysis.analysis?.when,
        analysis_donde: parsedAnalysis.analysis?.where,
        analysis_porque: parsedAnalysis.analysis?.why,
        analysis_keywords: parsedAnalysis.keywords || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptionId);

    if (updateError) {
      console.error('[process-tv-with-gemini] Database update error:', updateError);
    } else {
      console.log('[process-tv-with-gemini] Database updated successfully');
    }
  } catch (dbError) {
    console.error('[process-tv-with-gemini] Database operation error:', dbError);
  }
}
