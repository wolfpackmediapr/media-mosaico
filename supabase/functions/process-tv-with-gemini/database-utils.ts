
import { ParsedAnalysis } from './analysis-parser.ts';

interface TranscriptionUpdate {
  transcription_text?: string;
  status?: string;
  progress?: number;
  summary?: string;
  keywords?: string[];
  analysis_summary?: string;
  analysis_quien?: string;
  analysis_que?: string;
  analysis_cuando?: string;
  analysis_donde?: string;
  analysis_porque?: string;
  analysis_keywords?: string[];
  updated_at?: string;
}

export async function updateTranscriptionRecord(
  supabase: any, 
  transcriptionId: string, 
  updateData: TranscriptionUpdate | ParsedAnalysis
): Promise<void> {
  try {
    console.log('[database-utils] Updating transcription record:', transcriptionId);
    
    // Handle both old ParsedAnalysis format and new direct update format
    let updatePayload: TranscriptionUpdate;
    
    if ('transcription' in updateData) {
      // Legacy ParsedAnalysis format
      const parsedData = updateData as ParsedAnalysis;
      updatePayload = {
        transcription_text: parsedData.transcription || 'Transcripción procesada',
        status: 'completed',
        progress: 100,
        summary: parsedData.summary || 'Análisis completado',
        keywords: parsedData.keywords || [],
        analysis_summary: parsedData.summary,
        analysis_quien: parsedData.analysis?.who,
        analysis_que: parsedData.analysis?.what,
        analysis_cuando: parsedData.analysis?.when,
        analysis_donde: parsedData.analysis?.where,
        analysis_porque: parsedData.analysis?.why,
        analysis_keywords: parsedData.keywords || [],
        updated_at: new Date().toISOString()
      };
    } else {
      // Direct update format
      updatePayload = updateData as TranscriptionUpdate;
    }
    
    const { error: updateError } = await supabase
      .from('tv_transcriptions')
      .update(updatePayload)
      .eq('id', transcriptionId);

    if (updateError) {
      console.error('[database-utils] Database update error:', updateError);
    } else {
      console.log('[database-utils] Database updated successfully');
    }
  } catch (dbError) {
    console.error('[database-utils] Database operation error:', dbError);
  }
}
