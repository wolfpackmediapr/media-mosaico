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
  summary?: string;
  analysis?: {
    who?: string;
    what?: string;
    when?: string;
    where?: string;
    why?: string;
  };
}

export const parseAnalysisContent = (analysis: string): string => {
  if (!analysis) return "";

  // Check if it's already formatted text with content type markers
  if (analysis.includes("[TIPO DE CONTENIDO:")) {
    return consolidateContent(analysis);
  }

  // Try to parse as JSON (legacy format)
  try {
    const parsed: ParsedAnalysisData = JSON.parse(analysis);
    
    // Convert JSON back to formatted text with content type markers
    // Consolidate all program content into ONE section
    let programContent = "";
    let advertisementSections: string[] = [];
    
    // Collect transcription and analysis into program content
    if (parsed.transcription) {
      programContent += "TRANSCRIPCIÓN:\n" + parsed.transcription + "\n\n";
    }
    
    if (parsed.analysis) {
      programContent += "ANÁLISIS 5W:\n";
      if (parsed.analysis.who) programContent += `QUIÉN: ${parsed.analysis.who}\n`;
      if (parsed.analysis.what) programContent += `QUÉ: ${parsed.analysis.what}\n`;
      if (parsed.analysis.when) programContent += `CUÁNDO: ${parsed.analysis.when}\n`;
      if (parsed.analysis.where) programContent += `DÓNDE: ${parsed.analysis.where}\n`;
      if (parsed.analysis.why) programContent += `POR QUÉ: ${parsed.analysis.why}\n`;
      programContent += "\n";
    }
    
    if (parsed.summary) {
      programContent += "RESUMEN: " + parsed.summary + "\n\n";
    }
    
    if (parsed.keywords && parsed.keywords.length > 0) {
      programContent += "PALABRAS CLAVE: " + parsed.keywords.join(', ') + "\n\n";
    }
    
    // Process segments - separate ads from regular content
    if (parsed.segments && parsed.segments.length > 0) {
      parsed.segments.forEach((segment) => {
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
          if (segment.headline && !programContent.includes(segment.headline)) {
            programContent += `TITULAR: ${segment.headline}\n\n`;
          }
          programContent += segment.text + "\n\n";
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
    finalContent += advertisementSections.join('\n\n');
    
    return finalContent.trim();
    
  } catch (error) {
    console.warn('[analysisParser] Could not parse as JSON, treating as plain text:', error);
    
    // If it's not JSON and doesn't have content type markers, wrap it as program content
    if (!analysis.includes("[TIPO DE CONTENIDO:")) {
      return `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${analysis}`;
    }
    
    return consolidateContent(analysis);
  }
};

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