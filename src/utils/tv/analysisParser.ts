interface ParsedSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}

interface ParsedAnalysisData {
  transcription?: string;
  visual_analysis?: string;
  segments?: ParsedSegment[];
  keywords?: string[];
  palabras_clave?: string[];
  summary?: string;
  resumen?: string;
  analysis?: {
    who?: string;
    what?: string;
    when?: string;
    where?: string;
    why?: string;
  };
  analisis_5w?: {
    quien?: string;
    que?: string;
    cuando?: string;
    donde?: string;
    porque?: string;
  };
  relevancia_clientes?: Array<{
    cliente: string;
    nivel_relevancia: string;
    razon: string;
  }>;
  alertas?: string[];
  puntuacion_impacto?: string;
  recomendaciones?: string[];
}

export const parseAnalysisContent = (analysis: string): string => {
  console.log('[parseAnalysisContent] Starting analysis parsing');
  
  if (!analysis || typeof analysis !== 'string') {
    console.log('[parseAnalysisContent] No analysis content provided');
    return '';
  }

  // Remove transcription contamination from mixed content first
  const cleanedInput = removeTranscriptionFromMixedContent(analysis);

  // Try parsing as JSON first
  try {
    const cleanJson = cleanedInput.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    console.log('[parseAnalysisContent] Successfully parsed as JSON');
    
    // Convert to readable format and ensure no transcription content
    const formattedResult = convertJsonToReadableFormat(parsed);
    return cleanTranscriptionFromAnalysis(formattedResult);
  } catch (jsonError) {
    console.log('[parseAnalysisContent] JSON parsing failed, checking existing formatting');
  }

  // Check if already formatted with content type markers
  if (cleanedInput.includes('[TIPO DE CONTENIDO:')) {
    console.log('[parseAnalysisContent] Content already formatted with type markers');
    return consolidateContent(cleanedInput);
  }

  // Treat as plain text analysis
  console.log('[parseAnalysisContent] Processing as plain text analysis');
  const contentType = determineContentType(cleanedInput);
  return `[TIPO DE CONTENIDO: ${contentType}]\n\n${cleanTranscriptionContent(cleanedInput)}`;
};

// Enhanced function to clean transcription content from analysis
function cleanTranscriptionFromAnalysis(content: string): string {
  if (!content) return content;
  
  // Remove any JSON artifacts
  let cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/^\s*{\s*$/gm, '')
    .replace(/^\s*}\s*$/gm, '');
  
  // Remove lines that look like transcription
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    
    // Skip lines that look like speaker dialogue
    if (/^SPEAKER\s+\d+:/i.test(trimmed)) return false;
    if (/^[A-ZÁÉÍÓÚÑÜ\s]+:\s+/i.test(trimmed)) return false;
    if (trimmed.startsWith('"transcription"')) return false;
    if (trimmed.includes('SPEAKER 1:') || trimmed.includes('SPEAKER 2:')) return false;
    
    return true;
  });
  
  return filteredLines.join('\n').trim();
}

// Helper function to determine content type from analysis data
function determineContentType(data: any): string {
  if (typeof data === 'object') {
    // Check for advertisement indicators in segments or content
    const hasAds = data.segments?.some((segment: any) => 
      segment.headline?.toLowerCase().includes('anuncio') ||
      segment.text?.toLowerCase().includes('publicidad')
    );
    return hasAds ? 'PROGRAMA REGULAR + ANUNCIOS' : 'PROGRAMA REGULAR';
  }
  
  // For string content, check for advertisement keywords
  const text = data.toString().toLowerCase();
  const hasAdKeywords = text.includes('anuncio') || text.includes('publicidad') || text.includes('comercial');
  return hasAdKeywords ? 'PROGRAMA REGULAR + ANUNCIOS' : 'PROGRAMA REGULAR';
}

// Convert JSON analysis data to human-readable formatted text
function convertJsonToReadableFormat(parsed: ParsedAnalysisData | any): string {
  console.log('[convertJsonToReadableFormat] Converting analysis to readable format');
  
  // Check if this is analysis or transcription JSON data
  const isAnalysisJson = parsed.analysis || parsed.analisis_5w || parsed.resumen || parsed.summary || 
                         parsed.keywords || parsed.palabras_clave || parsed.visual_analysis ||
                         parsed.segments || parsed.who || parsed.what;
  
  if (!isAnalysisJson) {
    console.log('[convertJsonToReadableFormat] Not analysis JSON, treating as plain text');
    return parsed.toString();
  }
  
  const analysisContent = [];
  
  // Handle visual analysis or summary first
  const visualAnalysis = parsed.analisis_visual || parsed.visual_analysis || parsed.resumen || parsed.summary || '';
  if (visualAnalysis && !isTranscriptionContent(visualAnalysis)) {
    analysisContent.push(`**Resumen del contenido:**\n${visualAnalysis}`);
  }

  // Handle 5W analysis in a structured way
  const analysis5w = parsed.analisis_5w || parsed.analysis || {};
  if (Object.keys(analysis5w).length > 0) {
    const analysisSection = [];
    
    if (analysis5w.quien || analysis5w.who) {
      analysisSection.push(`**Quién:** ${analysis5w.quien || analysis5w.who}`);
    }
    if (analysis5w.que || analysis5w.what) {
      analysisSection.push(`**Qué:** ${analysis5w.que || analysis5w.what}`);
    }
    if (analysis5w.cuando || analysis5w.when) {
      analysisSection.push(`**Cuándo:** ${analysis5w.cuando || analysis5w.when}`);
    }
    if (analysis5w.donde || analysis5w.where) {
      analysisSection.push(`**Dónde:** ${analysis5w.donde || analysis5w.where}`);
    }
    if (analysis5w.porque || analysis5w.why) {
      analysisSection.push(`**Por qué:** ${analysis5w.porque || analysis5w.why}`);
    }

    if (analysisSection.length > 0) {
      analysisContent.push(`**Análisis 5W:**\n${analysisSection.join('\n')}`);
    }
  }

  // Handle keywords
  const keywords = parsed.palabras_clave || parsed.keywords || [];
  if (Array.isArray(keywords) && keywords.length > 0) {
    analysisContent.push(`**Palabras clave:** ${keywords.join(', ')}`);
  }

  // Handle segments if present
  if (parsed.segmentos || parsed.segments) {
    const segments = parsed.segmentos || parsed.segments;
    if (Array.isArray(segments)) {
      const segmentTexts = segments
        .map((segment: any) => {
          const segmentText = segment.texto || segment.text || '';
          const title = segment.titulo || segment.headline || '';
          if (segmentText && !isTranscriptionContent(segmentText)) {
            return title ? `**${title}:** ${segmentText}` : segmentText;
          }
          return null;
        })
        .filter(Boolean);
      
      if (segmentTexts.length > 0) {
        analysisContent.push(`**Segmentos identificados:**\n${segmentTexts.join('\n\n')}`);
      }
    }
  }

  // Create the main program section
  if (analysisContent.length > 0) {
    return `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${analysisContent.join('\n\n')}`;
  }

  return '[TIPO DE CONTENIDO: PROGRAMA REGULAR]\nAnálisis completado exitosamente';
}

// Helper function to consolidate multiple program sections into one
function consolidateContent(content: string): string {
  const sections = content.split(/(\[TIPO DE CONTENIDO: [^\]]+\])/);
  
  let programContent = "";
  let advertisementSections = [];
  let currentType = "";
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    
    if (section.startsWith("[TIPO DE CONTENIDO:")) {
      currentType = section;
    } else if (section && currentType) {
      if (currentType.includes("ANUNCIO PUBLICITARIO")) {
        advertisementSections.push(currentType + "\n" + section);
      } else if (currentType.includes("PROGRAMA REGULAR")) {
        // Consolidate all program content
        programContent += section + "\n\n";
      }
      currentType = "";
    }
  }
  
  // Build final result
  let result = "";
  
  // Add ONE consolidated program section
  if (programContent.trim()) {
    result += `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${programContent.trim()}\n\n`;
  }
  
  // Add separate advertisement sections
  if (advertisementSections.length > 0) {
    result += advertisementSections.join('\n\n');
  }
  
  return result.trim();
}

// Enhanced transcription cleaning with better validation
function cleanTranscriptionContent(transcription: string): string {
  if (!transcription) return "";
  
  let cleaned = transcription;
  
  // Enhanced JSON and structure cleanup
  cleaned = cleaned
    .replace(/[\{\}]/g, '')
    .replace(/"[^"]*":\s*/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/[\[\]]/g, '')
    .replace(/,\s*$/gm, '')
    .replace(/^\s*,/gm, '')
    .replace(/## PASO \d+:.*$/gmi, '') // Remove step headers
    .replace(/## SECCIÓN \d+:.*$/gmi, '') // Remove section headers
    .replace(/\[TIPO DE CONTENIDO:.*?\]/gi, '') // Remove content type markers
    .trim();
  
  // Enhanced filtering for speaker dialogue only
  const lines = cleaned.split('\n').filter(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) return false;
    
    // Enhanced analysis field detection
    const analysisKeywords = [
      'transcription', 'visual_analysis', 'analysis', 'summary', 'keywords', 'segments',
      'transcripción', 'análisis', 'resumen', 'palabras', 'segmentos',
      'who', 'what', 'when', 'where', 'why', 'quién', 'qué', 'cuándo', 'dónde', 'por qué',
      'formato', 'reglas', 'ejemplo', 'paso', 'sección', 'crítico'
    ];
    
    const lowerLine = trimmed.toLowerCase();
    const isAnalysisField = analysisKeywords.some(keyword => 
      lowerLine.startsWith(keyword + ':') || 
      lowerLine.includes(keyword + ':') ||
      lowerLine.startsWith('"' + keyword + '"') ||
      lowerLine.includes('"' + keyword + '":')
    );
    
    // Skip analysis fields and formatting instructions
    if (isAnalysisField) return false;
    if (trimmed.startsWith('**') || trimmed.startsWith('##')) return false;
    if (trimmed.includes('FORMATO OBLIGATORIO') || trimmed.includes('REGLAS ESTRICTAS')) return false;
    
    // Enhanced speaker dialogue validation
    return hasValidSpeakerFormat(trimmed) || hasDialoguePattern(trimmed);
  });
  
  return lines.join('\n').trim();
}

// Enhanced speaker format validation
function hasValidSpeakerFormat(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  const speakerPatterns = [
    /^SPEAKER\s+\d+:\s*[^:]+:\s*.+/i, // SPEAKER 1: NAME: content
    /^SPEAKER\s+\d+:\s*.+/i, // SPEAKER 1: content
    /^(PRESENTER|HOST|GUEST|LOCUTOR|ENTREVISTADO|CONDUCTOR|REPORTERO|REPORTERA|INVITADO|INVITADA|COMENTARISTA|ANALISTA|PERIODISTA):\s*.+/i,
    /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{1,20}:\s*[^:].+/i // NAME: content
  ];
  
  return speakerPatterns.some(pattern => pattern.test(text)) && 
         !text.includes('{') && 
         !text.includes('"') &&
         !text.includes('transcription') &&
         !text.includes('análisis');
}

// Check for natural dialogue patterns
function hasDialoguePattern(text: string): boolean {
  if (!text || text.length < 15) return false;
  
  const dialogueIndicators = [
    /\b(dice|comenta|afirma|explica|menciona|señala|indica|pregunta|responde):/i,
    /\b(buenos días|buenas tardes|buenas noches|bienvenidos|gracias|efectivamente):/i,
    /:.*\b(es|son|está|están|fue|fueron|será|serán|tiene|tienen)\b/i
  ];
  
  const hasColon = text.includes(':') && !text.includes('"');
  const hasDialogueMarkers = dialogueIndicators.some(pattern => pattern.test(text));
  
  return hasColon && (hasDialogueMarkers || text.split(':')[0].trim().length < 25);
}

// Remove transcription content from mixed analysis content
function removeTranscriptionFromMixedContent(content: string): string {
  if (!content) return '';
  
  // Remove SPEAKER patterns and associated dialogue
  let cleaned = content.replace(/SPEAKER\s+\d+:\s*[^:]+:.*$/gm, '');
  
  // Remove obvious transcription sections
  cleaned = cleaned.replace(/## TRANSCRIPCIÓN[\s\S]*?(?=##|$)/g, '');
  cleaned = cleaned.replace(/transcripción:[\s\S]*?(?=,|"|$)/gi, '');
  
  // Remove JSON artifacts but preserve analysis JSON
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove instruction text
  cleaned = cleaned.replace(/## INSTRUCCIONES.*?(?=\{|$)/gs, '');
  cleaned = cleaned.replace(/PASO \d+.*?(?=\{|$)/gs, '');
  
  return cleaned.trim();
}

// Check if content contains transcription-like content
function isTranscriptionContent(text: string): boolean {
  if (!text) return false;
  
  const transcriptionIndicators = [
    /SPEAKER\s+\d+:/i,
    /^[A-ZÁÉÍÓÚÑÜ\s]+:\s*[A-Z]/,
    /transcripción/i,
    /transcription/i
  ];
  
  return transcriptionIndicators.some(pattern => pattern.test(text));
}

// Check if text has speaker format
function hasSpeakerFormat(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  const speakerPatterns = [
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /CONDUCTOR:/i,
    /REPORTERO:|REPORTERA:/i,
    /INVITADO:|INVITADA:/i,
    /^[A-ZÁÉÍÓÚÑÜ\s]{2,15}:\s*/m // Generic speaker pattern
  ];
  
  return speakerPatterns.some(pattern => pattern.test(text)) ||
         (text.includes(':') && !text.includes('{') && !text.includes('"'));
}