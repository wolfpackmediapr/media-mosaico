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
    return analysis;
  }

  // Try to parse as JSON
  try {
    const parsed: ParsedAnalysisData = JSON.parse(analysis);
    
    // Convert JSON back to formatted text with content type markers
    let formattedContent = "";
    
    // Add transcription section if available
    if (parsed.transcription) {
      formattedContent += "[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n";
      formattedContent += "TRANSCRIPCIÓN:\n";
      formattedContent += parsed.transcription;
      formattedContent += "\n\n";
    }
    
    // Add segments if available
    if (parsed.segments && parsed.segments.length > 0) {
      parsed.segments.forEach((segment, index) => {
        // Determine if this is an advertisement based on keywords or content
        const isAd = segment.keywords?.some(keyword => 
          keyword.toLowerCase().includes('anuncio') || 
          keyword.toLowerCase().includes('publicidad') ||
          keyword.toLowerCase().includes('comercial')
        ) || segment.text.toLowerCase().includes('anuncio');
        
        formattedContent += `[TIPO DE CONTENIDO: ${isAd ? 'ANUNCIO PUBLICITARIO' : 'PROGRAMA REGULAR'}]\n`;
        
        if (segment.headline) {
          formattedContent += `TITULAR: ${segment.headline}\n\n`;
        }
        
        formattedContent += segment.text;
        
        if (segment.keywords && segment.keywords.length > 0) {
          formattedContent += `\n\nPALABRAS CLAVE: ${segment.keywords.join(', ')}`;
        }
        
        formattedContent += "\n\n";
      });
    }
    
    // Add analysis section if available
    if (parsed.analysis) {
      formattedContent += "[TIPO DE CONTENIDO: ANÁLISIS]\n";
      formattedContent += "ANÁLISIS 5W:\n";
      
      if (parsed.analysis.who) {
        formattedContent += `QUIÉN: ${parsed.analysis.who}\n`;
      }
      if (parsed.analysis.what) {
        formattedContent += `QUÉ: ${parsed.analysis.what}\n`;
      }
      if (parsed.analysis.when) {
        formattedContent += `CUÁNDO: ${parsed.analysis.when}\n`;
      }
      if (parsed.analysis.where) {
        formattedContent += `DÓNDE: ${parsed.analysis.where}\n`;
      }
      if (parsed.analysis.why) {
        formattedContent += `POR QUÉ: ${parsed.analysis.why}\n`;
      }
      
      formattedContent += "\n";
    }
    
    // Add summary if available
    if (parsed.summary) {
      formattedContent += "RESUMEN: " + parsed.summary + "\n\n";
    }
    
    // Add keywords if available
    if (parsed.keywords && parsed.keywords.length > 0) {
      formattedContent += "PALABRAS CLAVE: " + parsed.keywords.join(', ');
    }
    
    return formattedContent.trim();
    
  } catch (error) {
    console.warn('[analysisParser] Could not parse as JSON, treating as plain text:', error);
    
    // If it's not JSON and doesn't have content type markers, wrap it as program content
    if (!analysis.includes("[TIPO DE CONTENIDO:")) {
      return `[TIPO DE CONTENIDO: PROGRAMA REGULAR]\n${analysis}`;
    }
    
    return analysis;
  }
};