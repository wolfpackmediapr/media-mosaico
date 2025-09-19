
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

  // Strategy 1: Enhanced JSON extraction with analysis cleaning
  try {
    const cleanJson = extractAndCleanJSON(analysisText);
    if (cleanJson) {
      const parsedAnalysis = JSON.parse(cleanJson);
      console.log('[process-tv-with-gemini] Successfully parsed clean JSON analysis');
      
      // Clean the transcription field to remove any analysis content
      if (parsedAnalysis.transcription) {
        parsedAnalysis.transcription = cleanTranscriptionFromAnalysis(parsedAnalysis.transcription);
      }
      
      // Clean other analysis fields to avoid mixed content
      if (parsedAnalysis.summary) {
        parsedAnalysis.summary = cleanAnalysisContent(parsedAnalysis.summary);
      }
      
      if (parsedAnalysis.visual_analysis) {
        parsedAnalysis.visual_analysis = cleanAnalysisContent(parsedAnalysis.visual_analysis);
      }
      
      return parsedAnalysis;
    }
  } catch (parseError) {
    console.log('[process-tv-with-gemini] Enhanced JSON parsing failed:', parseError.message);
  }

  // Strategy 2: Manual field extraction from mixed content
  console.log('[process-tv-with-gemini] Falling back to manual extraction');
  
  const transcriptionText = extractTranscriptionWithSpeakerParsing(analysisText);
  const cleanAnalysisOnly = extractAnalysisFieldsOnly(analysisText);
  
  return {
    transcription: transcriptionText,
    visual_analysis: cleanAnalysisOnly.visual_analysis || "Análisis visual procesado",
    segments: cleanAnalysisOnly.segments || [{
      headline: "Contenido Principal", 
      text: cleanAnalysisOnly.summary?.substring(0, 500) || "Resumen del contenido",
      start: 0,
      end: 60,
      keywords: cleanAnalysisOnly.keywords || []
    }],
    keywords: cleanAnalysisOnly.keywords || extractKeywordsFromText(transcriptionText),
    summary: cleanAnalysisOnly.summary || "Análisis completado exitosamente",
    analysis: cleanAnalysisOnly.analysis || {
      who: "Participantes del contenido analizado",
      what: "Análisis de contenido televisivo", 
      when: "Durante la transmisión",
      where: "Puerto Rico/Región Caribe",
      why: "Información noticiosa de relevancia"
    }
  };
}

// Extract and clean JSON from mixed content
function extractAndCleanJSON(text: string): string | null {
  // Strategy 1: Find JSON between braces
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  
  let cleanJson = jsonMatch[0];
  
  // Remove transcription content that leaked into analysis fields
  try {
    const parsed = JSON.parse(cleanJson);
    
    // Clean each field
    Object.keys(parsed).forEach(key => {
      if (typeof parsed[key] === 'string') {
        // Remove speaker dialogue from analysis fields
        if (key !== 'transcription') {
          parsed[key] = parsed[key]
            .replace(/SPEAKER\s+\d+:\s*[^:]+:\s*.+/g, '')
            .replace(/^[A-ZÁÉÍÓÚÑÜ\s]{2,25}:\s*.+$/gm, '')
            .trim();
        }
      }
    });
    
    return JSON.stringify(parsed);
  } catch (e) {
    // If parsing failed, try basic cleanup
    return cleanJson
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }
}

// Extract only analysis fields, excluding transcription
function extractAnalysisFieldsOnly(text: string): {
  visual_analysis?: string;
  segments?: any[];
  keywords?: string[];
  summary?: string;
  analysis?: any;
} {
  const result: any = {};
  
  // Extract visual analysis
  const visualMatch = text.match(/"visual_analysis":\s*"([^"]+)"/);
  if (visualMatch) {
    result.visual_analysis = visualMatch[1];
  }
  
  // Extract summary
  const summaryMatch = text.match(/"summary":\s*"([^"]+)"/);
  if (summaryMatch) {
    result.summary = summaryMatch[1];
  }
  
  // Extract keywords
  const keywordsMatch = text.match(/"keywords":\s*\[([^\]]+)\]/);
  if (keywordsMatch) {
    try {
      result.keywords = JSON.parse(`[${keywordsMatch[1]}]`);
    } catch (e) {
      result.keywords = keywordsMatch[1].split(',').map(k => k.replace(/"/g, '').trim());
    }
  }
  
  // Extract analysis object
  const analysisMatch = text.match(/"analysis":\s*\{([^}]+)\}/);
  if (analysisMatch) {
    try {
      result.analysis = JSON.parse(`{${analysisMatch[1]}}`);
    } catch (e) {
      // Manual parsing fallback
      result.analysis = {};
      const fields = ['who', 'what', 'when', 'where', 'why'];
      fields.forEach(field => {
        const fieldMatch = text.match(new RegExp(`"${field}":\\s*"([^"]+)"`, 'i'));
        if (fieldMatch) {
          result.analysis[field] = fieldMatch[1];
        }
      });
    }
  }
  
  return result;
}

// Clean analysis content to remove transcription contamination
function cleanAnalysisContent(content: string): string {
  if (!content) return content;
  
  return content
    .replace(/SPEAKER\s+\d+:\s*[^:]+:\s*.+/g, '') // Remove speaker lines
    .replace(/^[A-ZÁÉÍÓÚÑÜ\s]{2,25}:\s*.+$/gm, '') // Remove speaker patterns
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
    .trim();
}

// Enhanced transcription extraction with better parsing
function extractTranscriptionWithSpeakerParsing(analysisText: string): string {
  console.log('[analysis-parser] Starting enhanced transcription extraction');
  
  // Enhanced Strategy 1: Extract from JSON transcription field with better parsing
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.transcription) {
        const cleanTranscription = cleanTranscriptionFromGeminiResponse(parsed.transcription);
        if (cleanTranscription && hasTvSpeakerPatterns(cleanTranscription)) {
          console.log('[analysis-parser] Successfully extracted from JSON structure');
          return cleanTranscription;
        }
      }
    }
  } catch (error) {
    console.log('[analysis-parser] JSON parsing failed, trying alternative methods');
  }
  
  // Strategy 2: Extract from structured sections with enhanced patterns
  const sectionPatterns = [
    /## PASO 1: TRANSCRIPCIÓN[:\s]*([^#]+?)(?=##|\[TIPO|$)/s,
    /TRANSCRIPCIÓN[:\s]*([^[#]+?)(?=\[|##|$)/s,
    /## SECCIÓN 1[:\s]*([^#]+?)(?=##|$)/s,
    /"transcription"[:\s]*"([^"]+)"/s
  ];
  
  for (const pattern of sectionPatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      const cleanTranscription = cleanTranscriptionFromGeminiResponse(match[1]);
      if (cleanTranscription && hasTvSpeakerPatterns(cleanTranscription)) {
        console.log('[analysis-parser] Successfully extracted from section pattern');
        return cleanTranscription;
      }
    }
  }
  
  // Strategy 3: Enhanced speaker dialogue extraction
  const speakerContent = extractSpeakerDialogueOnly(analysisText);
  if (speakerContent && speakerContent.length > 50) {
    console.log('[analysis-parser] Successfully extracted speaker dialogue');
    return speakerContent;
  }
  
  // Strategy 4: Natural language processing fallback
  const naturalDialogue = extractNaturalDialogue(analysisText);
  if (naturalDialogue && naturalDialogue.length > 50) {
    console.log('[analysis-parser] Successfully extracted natural dialogue');
    return naturalDialogue;
  }
  
  console.log('[analysis-parser] No valid transcription found');
  return 'Transcripción no disponible - contenido no contiene diálogos identificables';
}

// Extract only clean speaker dialogue from mixed content  
function extractSpeakerDialogueOnly(text: string): string {
  if (!text) return '';
  
  const lines = text.split('\n');
  const speakerLines: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 10) continue;
    
    // Enhanced speaker detection patterns
    const speakerPatterns = [
      /^SPEAKER\s+\d+:\s*[^:]+:\s*.+/i,
      /^SPEAKER\s+\d+:\s*.+/i,
      /^(PRESENTER|HOST|GUEST|LOCUTOR|ENTREVISTADO|CONDUCTOR|REPORTERO|REPORTERA|INVITADO|INVITADA|COMENTARISTA|ANALISTA|PERIODISTA):\s*.+/i,
      /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{1,20}:\s*[^:].+/
    ];
    
    const isDialogue = speakerPatterns.some(pattern => pattern.test(trimmedLine));
    const isNotAnalysis = !isAnalysisField(trimmedLine) && 
                         !trimmedLine.includes('{') && 
                         !trimmedLine.includes('"') &&
                         !trimmedLine.startsWith('##') &&
                         !trimmedLine.startsWith('[');
    
    if (isDialogue && isNotAnalysis) {
      speakerLines.push(trimmedLine);
    }
  }
  
  return speakerLines.join('\n');
}

// Extract natural dialogue using conversation flow detection
function extractNaturalDialogue(text: string): string {
  if (!text) return '';
  
  const lines = text.split('\n');
  const dialogueLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 15) continue;
    
    // Look for conversation indicators
    const conversationIndicators = [
      /\b(dice|comenta|afirma|explica|menciona|señala|indica|pregunta|responde)\b/i,
      /\b(buenos días|buenas tardes|buenas noches|bienvenidos|gracias|efectivamente)\b/i,
      /\b(por favor|disculpe|perdón|exactamente|correcto)\b/i,
      /:.*\b(es|son|está|están|fue|fueron|será|serán|tiene|tienen|había|hubo)\b/i
    ];
    
    const hasConversationPattern = conversationIndicators.some(pattern => pattern.test(line));
    const hasColon = line.includes(':') && !line.startsWith('{');
    const isNotAnalysis = !isAnalysisField(line) && !line.includes('"') && !line.startsWith('#');
    
    if ((hasConversationPattern || hasColon) && isNotAnalysis) {
      // Try to format as speaker if not already formatted
      if (!line.match(/^SPEAKER\s+\d+:/i) && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const beforeColon = line.substring(0, colonIndex).trim();
        const afterColon = line.substring(colonIndex + 1).trim();
        
        if (beforeColon.length > 0 && afterColon.length > 10) {
          dialogueLines.push(`SPEAKER 1: ${beforeColon}: ${afterColon}`);
        }
      } else {
        dialogueLines.push(line);
      }
    }
  }
  
  return dialogueLines.slice(0, 20).join('\n'); // Limit lines to prevent overflow
}

// Enhanced function to clean transcription from Gemini's mixed responses
function cleanTranscriptionFromGeminiResponse(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove JSON artifacts and escape sequences
  cleaned = cleaned
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/[\{\}"]/g, '')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
  
  // Remove analysis section markers and headers
  cleaned = cleaned
    .replace(/## PASO \d+:.*$/gmi, '')
    .replace(/## SECCIÓN \d+:.*$/gmi, '')
    .replace(/\[TIPO DE CONTENIDO:.*?\]/gi, '')
    .replace(/\*\*FORMATO OBLIGATORIO.*?\*\*/s, '')
    .replace(/\*\*REGLAS ESTRICTAS.*?\*\*/s, '')
    .replace(/\*\*EJEMPLO.*?\*\*/s, '');
  
  // Split into lines and filter for valid speaker dialogue
  const lines = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line || line.length < 10) return false;
      
      // Skip analysis fields and markers
      if (isAnalysisField(line)) return false;
      if (line.startsWith('[') || line.startsWith('##') || line.startsWith('**')) return false;
      if (line.includes('transcription') || line.includes('analysis')) return false;
      
      // Keep lines that look like speaker dialogue
      return hasSpeakerFormat(line) || (line.includes(':') && !line.includes('"'));
    });
  
  return lines.join('\n').trim();
}

// Enhanced speaker format detection
function hasSpeakerFormat(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  const speakerPatterns = [
    /^SPEAKER\s+\d+:/i,
    /^(PRESENTER|HOST|GUEST|LOCUTOR|ENTREVISTADO|CONDUCTOR|REPORTERO|REPORTERA|INVITADO|INVITADA|COMENTARISTA|ANALISTA|PERIODISTA):/i,
    /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{1,20}:\s*[^:]/i
  ];
  
  return speakerPatterns.some(pattern => pattern.test(text)) && 
         !text.includes('{') && 
         !text.includes('"transcription"') &&
         !isAnalysisField(text);
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
