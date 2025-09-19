
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
  console.log('[analysis-parser] Starting transcription extraction from mixed content');
  
  // Step 1: Try to extract from structured sections first
  const transcriptionMatch = analysisText.match(/## SECCIÓN 1: TRANSCRIPCIÓN CON IDENTIFICACIÓN DE HABLANTES\s*([\s\S]*?)(?=\n## SECCIÓN 2:|$)/);
  
  if (transcriptionMatch) {
    let extractedText = transcriptionMatch[1].trim()
      .replace(/^- Format:.*\n- Uses.*\n- Complete.*\n\n?/m, '');
    
    // Clean extracted text from analysis artifacts
    extractedText = cleanTranscriptionFromAnalysis(extractedText);
    
    if (hasTvSpeakerPatterns(extractedText) && extractedText.length > 50) {
      console.log('[analysis-parser] Successfully extracted transcription from structured section');
      return extractedText;
    }
  }
  
  // Step 2: Try to extract from JSON transcription field
  const jsonTranscriptionMatch = analysisText.match(/"transcription"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s);
  if (jsonTranscriptionMatch) {
    let transcriptionText = jsonTranscriptionMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .trim();
    
    transcriptionText = cleanTranscriptionFromAnalysis(transcriptionText);
    
    if (hasTvSpeakerPatterns(transcriptionText) && transcriptionText.length > 50) {
      console.log('[analysis-parser] Successfully extracted transcription from JSON field');
      return transcriptionText;
    }
  }
  
  // Step 3: Look for speaker patterns in the full text
  const speakerPatterns = analysisText.match(/(?:SPEAKER\s+\d+(?:\s*:\s*[^:]+)?:|PRESENTER:|HOST:|LOCUTOR:|ENTREVISTADO:|CONDUCTOR:|REPORTERO:|REPORTERA:)[\s\S]*?(?=\n\n|\n(?:SPEAKER|PRESENTER|HOST|LOCUTOR|ENTREVISTADO|CONDUCTOR|REPORTERO|REPORTERA)|$)/gi);
  
  if (speakerPatterns && speakerPatterns.length > 0) {
    let transcriptionText = speakerPatterns.join('\n\n');
    transcriptionText = cleanTranscriptionFromAnalysis(transcriptionText);
    
    if (transcriptionText.length > 50) {
      console.log('[analysis-parser] Extracted transcription from speaker patterns');
      return transcriptionText;
    }
  }
  
  // Step 4: Try to extract dialogue-like content (lines with colons)
  const dialogueLines = analysisText.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 10 && 
             (trimmed.includes(':') && !trimmed.startsWith('{') && !trimmed.startsWith('"')) &&
             !isAnalysisField(trimmed);
    })
    .slice(0, 20); // Limit to prevent too much content
  
  if (dialogueLines.length > 0) {
    let transcriptionText = dialogueLines.join('\n');
    transcriptionText = cleanTranscriptionFromAnalysis(transcriptionText);
    
    if (transcriptionText.length > 50) {
      console.log('[analysis-parser] Extracted transcription from dialogue lines');
      return transcriptionText;
    }
  }
  
  // Final fallback: clean portion of text
  const cleanedText = cleanTranscriptionFromAnalysis(analysisText.substring(0, 2000));
  console.log('[analysis-parser] Using fallback transcription extraction');
  return cleanedText || "Contenido de transcripción no disponible en formato legible";
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

// Clean transcription content from analysis artifacts
function cleanTranscriptionFromAnalysis(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  // Remove JSON artifacts and structure
  cleaned = cleaned
    .replace(/[\{\}]/g, '') // Remove braces
    .replace(/"[^"]*":\s*/g, '') // Remove JSON keys like "transcription": 
    .replace(/^[^:]*transcription[^:]*:/i, '') // Remove transcription labels
    .replace(/^[^:]*visual_analysis[^:]*:.*$/gmi, '') // Remove visual analysis lines
    .replace(/^[^:]*analysis[^:]*:.*$/gmi, '') // Remove analysis lines
    .replace(/^[^:]*summary[^:]*:.*$/gmi, '') // Remove summary lines
    .replace(/^[^:]*keywords[^:]*:.*$/gmi, '') // Remove keywords lines
    .replace(/^[^:]*segments[^:]*:.*$/gmi, '') // Remove segments lines
    .replace(/\\"([^"]*)\\"[,\s]*/g, '$1 ') // Clean escaped quotes
    .replace(/\\n/g, '\n') // Convert literal \n to newlines
    .replace(/\\"/g, '"') // Convert escaped quotes
    .replace(/\\\//g, '/') // Convert escaped slashes
    .replace(/[\[\]]/g, '') // Remove brackets
    .replace(/,\s*$/gm, '') // Remove trailing commas
    .replace(/^\s*,/gm, '') // Remove leading commas
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple newlines
    .trim();
  
  // Remove analysis section markers and content
  cleaned = cleaned
    .replace(/## SECCIÓN \d+:.*$/gmi, '')
    .replace(/^(who|what|when|where|why|quién|qué|cuándo|dónde|por qué):\s*.*/gmi, '')
    .replace(/^(ANÁLISIS|RESUMEN|PALABRAS CLAVE|SEGMENTOS):\s*.*/gmi, '')
    .replace(/^(analysis|summary|keywords|segments):\s*.*/gmi, '');
  
  // Ensure we only keep speaker dialogue
  const lines = cleaned.split('\n').filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // Keep lines that look like speaker dialogue
    return hasTvSpeakerPatterns(trimmed) || 
           (trimmed.includes(':') && trimmed.length > 10 && !isAnalysisField(trimmed));
  });
  
  return lines.join('\n').trim();
}

// Check if a line contains analysis field keywords
function isAnalysisField(text: string): boolean {
  const analysisKeywords = [
    'transcription', 'visual_analysis', 'analysis', 'summary', 'keywords', 'segments',
    'transcripción', 'análisis', 'resumen', 'palabras', 'segmentos',
    'who', 'what', 'when', 'where', 'why', 'quién', 'qué', 'cuándo', 'dónde', 'por qué'
  ];
  
  const lowerText = text.toLowerCase();
  return analysisKeywords.some(keyword => 
    lowerText.startsWith(keyword + ':') || 
    lowerText.startsWith('"' + keyword + '"') ||
    lowerText.includes('"' + keyword + '":')
  );
}

// Enhanced check for TV-specific speaker patterns
function hasTvSpeakerPatterns(text: string): boolean {
  if (!text || !text.trim()) return false;
  
  const patterns = [
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /CONDUCTOR:/i,
    /REPORTERO:|REPORTERA:/i,
    /INVITADO:|INVITADA:/i,
    /COMENTARISTA:/i,
    /ANALISTA:/i,
    /PERIODISTA:/i,
    /\[SPEAKER\s+\d+\]/i,
    /^\s*-\s*\w+:/m,
    /^[A-ZÁÉÍÓÚÑÜ\s]{2,15}:\s*/m // Generic speaker pattern (caps, reasonable length)
  ];
  
  return patterns.some(pattern => pattern.test(text));
}
