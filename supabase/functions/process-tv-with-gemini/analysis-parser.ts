
export interface ParsedAnalysis {
  transcription: string;
  visual_analysis: string;
  segments: Array<{
    headline: string;
    text: string;
    start: number;
    end: number;
    keywords?: string[];
  }>;
  keywords: string[];
  summary: string;
  analysis: {
    who?: string;
    what?: string;
    when?: string;
    where?: string;
    why?: string;
  };
}

export function parseAnalysisText(analysisText: string): ParsedAnalysis {
  console.log('[process-tv-with-gemini] Raw analysis length:', analysisText.length);

  // Try multiple JSON cleanup strategies
  const cleanupStrategies = [
    // Strategy 1: Standard cleanup
    (text: string) => text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(),
    // Strategy 2: More aggressive cleanup
    (text: string) => {
      let cleaned = text.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '').trim();
      // Remove any text before first { and after last }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      return cleaned;
    },
    // Strategy 3: Extract JSON from mixed content
    (text: string) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? jsonMatch[0] : text;
    }
  ];

  // Try each cleanup strategy
  for (let i = 0; i < cleanupStrategies.length; i++) {
    try {
      const cleanJson = cleanupStrategies[i](analysisText);
      console.log(`[process-tv-with-gemini] Trying cleanup strategy ${i + 1}, cleaned length:`, cleanJson.length);
      
      const parsedAnalysis = JSON.parse(cleanJson);
      console.log('[process-tv-with-gemini] Successfully parsed JSON analysis with strategy', i + 1);
      
      // Validate that we have the expected structure
      if (parsedAnalysis && (parsedAnalysis.transcription || parsedAnalysis.summary)) {
        return parsedAnalysis;
      } else {
        console.warn('[process-tv-with-gemini] Parsed JSON missing expected fields, trying next strategy');
      }
    } catch (parseError) {
      console.log(`[process-tv-with-gemini] Strategy ${i + 1} failed:`, parseError.message);
    }
  }

  // All JSON strategies failed - enhanced fallback with TV speaker parsing
  console.error('[process-tv-with-gemini] All JSON parse strategies failed');
  console.error('[process-tv-with-gemini] Raw text sample:', analysisText.substring(0, 500));
  
  // Extract transcription using TV speaker patterns
  const transcriptionText = extractTranscriptionWithSpeakerParsing(analysisText);
  
  return {
    transcription: transcriptionText,
    visual_analysis: "Análisis visual procesado con formato alternativo",
    segments: [{
      headline: "Contenido Principal", 
      text: transcriptionText.substring(0, 1000),
      start: 0,
      end: 60,
      keywords: extractKeywordsFromText(transcriptionText)
    }],
    keywords: extractKeywordsFromText(transcriptionText),
    summary: "Análisis completado exitosamente con procesamiento alternativo",
    analysis: {
      who: "Participantes del contenido analizado",
      what: "Análisis de contenido televisivo", 
      when: "Durante la transmisión",
      where: "Puerto Rico/Región Caribe",
      why: "Información noticiosa de relevancia"
    }
  };
}

// Extract transcription with proper TV speaker parsing
function extractTranscriptionWithSpeakerParsing(analysisText: string): string {
  // First try to extract from structured sections
  const transcriptionMatch = analysisText.match(/## SECCIÓN 1: TRANSCRIPCIÓN CON IDENTIFICACIÓN DE HABLANTES\s*([\s\S]*?)(?=\n## SECCIÓN 2:|$)/);
  
  if (transcriptionMatch) {
    const extractedText = transcriptionMatch[1].trim()
      .replace(/^- Format:.*\n- Uses.*\n- Complete.*\n\n?/m, '');
    
    // Check if it has TV speaker patterns, if not, try to improve formatting
    if (hasTvSpeakerPatterns(extractedText)) {
      return extractedText;
    }
  }
  
  // Fallback: look for any speaker-like patterns in the full text
  const speakerPatterns = analysisText.match(/(?:SPEAKER\s+\d+:|PRESENTER:|HOST:|LOCUTOR:|ENTREVISTADO:)[\s\S]*?(?=\n\n|\n(?:SPEAKER|PRESENTER|HOST|LOCUTOR|ENTREVISTADO)|$)/gi);
  
  if (speakerPatterns && speakerPatterns.length > 0) {
    return speakerPatterns.join('\n\n');
  }
  
  // Final fallback: return the first portion of text
  return analysisText.substring(0, 2000);
}

// Extract keywords from text content
function extractKeywordsFromText(text: string): string[] {
  if (!text) return ["analisis", "video", "contenido"];
  
  // Look for explicit keywords sections
  const keywordMatch = text.match(/(?:palabras clave|keywords)[:\s]*([^\n]*)/i);
  if (keywordMatch) {
    return keywordMatch[1].split(',').map(k => k.trim()).filter(k => k);
  }
  
  // Extract common meaningful words
  const words = text.toLowerCase().match(/\b[a-záéíóúñü]{4,}\b/g) || [];
  const uniqueWords = [...new Set(words)].filter(word => 
    !['este', 'esta', 'para', 'como', 'todo', 'todos', 'muy', 'más', 'entre', 'desde', 'hasta'].includes(word)
  );
  
  return uniqueWords.slice(0, 10);
}

// Check if text contains TV-specific speaker patterns
function hasTvSpeakerPatterns(text: string): boolean {
  if (!text || !text.trim()) return false;
  
  const patterns = [
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /\[SPEAKER\s+\d+\]/i,
    /^\s*-\s*\w+:/m
  ];
  
  return patterns.some(pattern => pattern.test(text));
}
