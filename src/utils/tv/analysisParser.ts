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
  if (!analysis) return "";

  // Check if it's already formatted text with content type markers
  if (analysis.includes("[TIPO DE CONTENIDO:")) {
    return consolidateContent(analysis);
  }

  // PRIORITY: Try to parse as JSON first (this is the main analysis format from Gemini)
  const trimmedAnalysis = analysis.trim();
  if (trimmedAnalysis.startsWith('{') && trimmedAnalysis.endsWith('}')) {
    try {
      const parsed: ParsedAnalysisData = JSON.parse(analysis);
      return convertJsonToReadableFormat(parsed);
    } catch (error) {
      console.warn('[analysisParser] JSON parsing failed:', error);
      // Continue to other parsing methods
    }
  }

  // SECONDARY: Check if content is already well-formatted (has bullets, numbers, proper structure)
  const hasFormatting = analysis.match(/^\s*[\d\-\•\*]\s+/m) || 
                       analysis.match(/^\s*\d+\.\s+/m) ||
                       analysis.includes('\n\n') ||
                       analysis.match(/^[A-ZÁÉÍÓÚÑ]+:\s*/m);

  // If already well-formatted, preserve as-is
  if (hasFormatting) {
    return `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${analysis}`;
  }

  // FALLBACK: Treat as plain text and wrap it
  return `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${analysis}`;
};

// Convert JSON analysis data to human-readable formatted text
function convertJsonToReadableFormat(parsed: ParsedAnalysisData | any): string {
  let programContent = "";
  let advertisementSections: string[] = [];
  
  // DO NOT include transcription in analysis display - keep them separate
  
  // Format 5W Analysis - handle both old and new Spanish formats
  const analysis5w = parsed.analysis || parsed.analisis_5w;
  if (analysis5w) {
    programContent += "ANÁLISIS 5W:\n";
    const who = analysis5w.who || analysis5w.quien;
    const what = analysis5w.what || analysis5w.que;
    const when = analysis5w.when || analysis5w.cuando;
    const where = analysis5w.where || analysis5w.donde;
    const why = analysis5w.why || analysis5w.porque;
    
    if (who) programContent += `• QUIÉN: ${who}\n`;
    if (what) programContent += `• QUÉ: ${what}\n`;
    if (when) programContent += `• CUÁNDO: ${when}\n`;
    if (where) programContent += `• DÓNDE: ${where}\n`;
    if (why) programContent += `• POR QUÉ: ${why}\n`;
    programContent += "\n";
  }
  
  // Format Summary - handle both formats
  const summary = parsed.summary || parsed.resumen;
  if (summary) {
    programContent += "RESUMEN:\n" + summary + "\n\n";
  }
  
  // Format Visual Analysis
  if (parsed.visual_analysis) {
    programContent += "ANÁLISIS VISUAL:\n" + parsed.visual_analysis + "\n\n";
  }
  
  // Format Keywords - handle both formats
  const keywords = parsed.keywords || parsed.palabras_clave;
  if (keywords && keywords.length > 0) {
    programContent += "PALABRAS CLAVE:\n" + keywords.join(', ') + "\n\n";
  }
  
  // Format Client Relevance (new Spanish format)
  if (parsed.relevancia_clientes && parsed.relevancia_clientes.length > 0) {
    programContent += "RELEVANCIA PARA CLIENTES:\n";
    parsed.relevancia_clientes.forEach((rel: any) => {
      programContent += `• ${rel.cliente} (${rel.nivel_relevancia}): ${rel.razon}\n`;
    });
    programContent += "\n";
  }
  
  // Format Alerts (new Spanish format)
  if (parsed.alertas && parsed.alertas.length > 0) {
    programContent += "ALERTAS:\n";
    parsed.alertas.forEach((alert: string) => {
      programContent += `• ${alert}\n`;
    });
    programContent += "\n";
  }
  
  // Format Impact Score (new Spanish format)
  if (parsed.puntuacion_impacto) {
    programContent += `PUNTUACIÓN DE IMPACTO: ${parsed.puntuacion_impacto}/10\n\n`;
  }
  
  // Format Recommendations (new Spanish format)
  if (parsed.recomendaciones && parsed.recomendaciones.length > 0) {
    programContent += "RECOMENDACIONES:\n";
    parsed.recomendaciones.forEach((rec: string) => {
      programContent += `• ${rec}\n`;
    });
    programContent += "\n";
  }
  
  // Process segments - separate ads from regular content
  if (parsed.segments && parsed.segments.length > 0) {
    programContent += "SEGMENTOS IDENTIFICADOS:\n\n";
    
    parsed.segments.forEach((segment, index) => {
      const isAd = segment.keywords?.some(keyword => 
        keyword.toLowerCase().includes('anuncio') || 
        keyword.toLowerCase().includes('publicidad') ||
        keyword.toLowerCase().includes('comercial')
      ) || segment.text.toLowerCase().includes('anuncio') || 
         segment.headline?.toLowerCase().includes('anuncio');
      
      if (isAd) {
        let adContent = `[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]\n`;
        if (segment.headline) adContent += `TITULAR: ${segment.headline}\n\n`;
        adContent += segment.text;
        if (segment.keywords && segment.keywords.length > 0) {
          adContent += `\n\nPALABRAS CLAVE: ${segment.keywords.join(', ')}`;
        }
        advertisementSections.push(adContent);
      } else {
        // Add to program content
        programContent += `${index + 1}. `;
        if (segment.headline) {
          programContent += `${segment.headline}\n`;
        }
        programContent += `${segment.text}\n`;
        if (segment.keywords && segment.keywords.length > 0) {
          programContent += `Palabras clave: ${segment.keywords.join(', ')}\n`;
        }
        programContent += "\n";
      }
    });
  }
  
  // Build final formatted content
  let finalContent = "";
  
  // Add ONE consolidated program section if there's program content
  if (programContent.trim()) {
    finalContent += `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${programContent.trim()}\n\n`;
  }
  
  // Add separate advertisement sections
  if (advertisementSections.length > 0) {
    finalContent += advertisementSections.join('\n\n');
  }
  
  return finalContent.trim() || "[TIPO DE CONTENIDO: PROGRAMA REGULAR]\nAnálisis completado exitosamente.";
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