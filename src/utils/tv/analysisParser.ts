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

// Helper to detect if content is structured analysis vs raw transcription
function isStructuredAnalysis(content: string): boolean {
  const analysisKeywords = [
    // Spanish analysis markers
    'Quién:', 'Qué:', 'Cuándo:', 'Dónde:', 'Por qué:',
    '**Quién:**', '**Qué:**', '**Cuándo:**', '**Dónde:**', '**Por qué:**',
    'ANÁLISIS 5W', 'RESUMEN', 'PALABRAS CLAVE', 'RELEVANCIA',
    // English analysis markers
    'Who:', 'What:', 'When:', 'Where:', 'Why:',
    'ANALYSIS', 'SUMMARY', 'KEYWORDS', 'RELEVANCE'
  ];
  
  const hasAnalysisMarkers = analysisKeywords.some(keyword => 
    content.includes(keyword)
  );
  
  // Check if it's mostly speaker dialogue (raw transcription)
  const lines = content.split('\n');
  const speakerLines = lines.filter(line => 
    /^SPEAKER\s+\d+:/i.test(line.trim()) || 
    /^[A-ZÁÉÍÓÚÑÜ\s]{2,20}:\s+/i.test(line.trim())
  );
  const isMostlySpeakerDialogue = speakerLines.length > lines.length * 0.3;
  
  return hasAnalysisMarkers && !isMostlySpeakerDialogue;
}

export const parseAnalysisContent = (analysis: string): string => {
  console.log('[parseAnalysisContent] Starting analysis parsing');
  
  if (!analysis || typeof analysis !== 'string') {
    console.log('[parseAnalysisContent] No analysis content provided');
    return '';
  }

  // Try parsing as JSON first
  try {
    const cleanJson = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    console.log('[parseAnalysisContent] Successfully parsed as JSON');
    
    const formattedResult = convertJsonToReadableFormat(parsed);
    return cleanTranscriptionFromAnalysis(formattedResult);
  } catch (jsonError) {
    console.log('[parseAnalysisContent] JSON parsing failed, checking existing formatting');
  }

  // Check if already formatted with content type markers
  if (analysis.includes('[TIPO DE CONTENIDO:')) {
    console.log('[parseAnalysisContent] Content already formatted with type markers');
    return consolidateContent(analysis);
  }

  // Determine if this is structured analysis or raw transcription
  if (isStructuredAnalysis(analysis)) {
    console.log('[parseAnalysisContent] Detected structured analysis content');
    const contentType = determineContentType(analysis);
    // Keep analysis content as-is, just add content type header if missing
    return `[TIPO DE CONTENIDO: ${contentType}]\n\n${analysis.trim()}`;
  }

  // Only apply transcription cleaning to raw dialogue
  console.log('[parseAnalysisContent] Processing as raw transcription');
  const contentType = determineContentType(analysis);
  return `[TIPO DE CONTENIDO: ${contentType}]\n\n${cleanTranscriptionContent(analysis)}`;
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

// Convert JSON analysis data to human-readable formatted text (plain text, no markdown)
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
  
  let sections: string[] = [];
  
  // Determine content type and add header
  const contentType = determineContentType(parsed);
  sections.push(`[TIPO DE CONTENIDO: ${contentType}]`);
  
  // 5W Analysis section (enhanced to handle both Spanish and English formats)
  const analysis5W = parsed.analisis_5w || parsed.analysis || {};
  if (Object.keys(analysis5W).length > 0 || parsed.who || parsed.what || parsed.when || parsed.where || parsed.why) {
    sections.push('\n=== ANÁLISIS 5W ===');
    
    const who = analysis5W.quien || analysis5W.who || parsed.who || 'No especificado';
    const what = analysis5W.que || analysis5W.what || parsed.what || 'No especificado';
    const when = analysis5W.cuando || analysis5W.when || parsed.when || 'No especificado';
    const where = analysis5W.donde || analysis5W.where || parsed.where || 'No especificado';
    const why = analysis5W.porque || analysis5W.why || parsed.why || 'No especificado';
    
    sections.push(`• Quién: ${who}`);
    sections.push(`• Qué: ${what}`);
    sections.push(`• Cuándo: ${when}`);
    sections.push(`• Dónde: ${where}`);
    sections.push(`• Por qué: ${why}`);
  }
  
  // Summary section (prioritize Spanish)
  const summary = parsed.resumen || parsed.summary;
  if (summary) {
    sections.push('\n=== RESUMEN ===');
    sections.push(summary);
  }
  
  // Visual analysis section
  if (parsed.visual_analysis) {
    sections.push('\n=== ANÁLISIS VISUAL ===');
    sections.push(parsed.visual_analysis);
  }
  
  // Keywords section (prioritize Spanish)
  const keywords = parsed.palabras_clave || parsed.keywords;
  if (keywords && Array.isArray(keywords)) {
    sections.push('\n=== PALABRAS CLAVE ===');
    sections.push(keywords.join(', '));
  }
  
  // Client relevance section (prioritize Spanish)
  const clientRelevance = parsed.relevancia_clientes || parsed.client_relevance;
  if (clientRelevance && Array.isArray(clientRelevance)) {
    sections.push('\n=== RELEVANCIA PARA CLIENTES ===');
    clientRelevance.forEach(client => {
      const clientName = client.cliente || client.client || 'Cliente';
      const relevanceLevel = client.nivel_relevancia || client.relevance_level || 'No especificado';
      const reason = client.razon || client.reason || 'No especificada';
      sections.push(`• ${clientName} (${relevanceLevel}): ${reason}`);
    });
  }
  
  // Alerts section (prioritize Spanish)
  const alerts = parsed.alertas || parsed.alerts;
  if (alerts && Array.isArray(alerts) && alerts.length > 0) {
    sections.push('\n=== ALERTAS ===');
    alerts.forEach(alert => {
      sections.push(`• ${alert}`);
    });
  }
  
  // Impact score section (prioritize Spanish)
  const impactScore = parsed.puntuacion_impacto || parsed.impact_score;
  if (impactScore) {
    sections.push('\n=== PUNTUACIÓN DE IMPACTO ===');
    sections.push(`${impactScore}/10`);
  }
  
  // Recommendations section (prioritize Spanish)
  const recommendations = parsed.recomendaciones || parsed.recommendations;
  if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
    sections.push('\n=== RECOMENDACIONES ===');
    recommendations.forEach(rec => {
      sections.push(`• ${rec}`);
    });
  }
  
  // Category section (prioritize Spanish)
  const category = parsed.categoria || parsed.category;
  if (category) {
    sections.push('\n=== CATEGORÍA ===');
    sections.push(category);
  }
  
  const result = sections.join('\n');
  console.log('[convertJsonToReadableFormat] Generated formatted analysis:', result.length, 'characters');
  
  return result;
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