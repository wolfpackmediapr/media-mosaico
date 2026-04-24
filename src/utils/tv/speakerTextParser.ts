import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

// Letters used to label unidentified speakers (A, B, C, ...)
const SPEAKER_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Convert any raw speaker token (number "1", letter "A", etc.) to a canonical letter.
 * 1 -> A, 2 -> B, A -> A, B -> B
 */
function toLetter(raw: string, fallbackIndex: number): string {
  const trimmed = (raw || "").trim().toUpperCase();
  if (/^[A-Z]$/.test(trimmed)) return trimmed;
  const num = parseInt(trimmed, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= SPEAKER_LETTERS.length) {
    return SPEAKER_LETTERS[num - 1];
  }
  return SPEAKER_LETTERS[Math.min(fallbackIndex, SPEAKER_LETTERS.length - 1)];
}

/**
 * Parse TV-specific speaker-formatted text into structured utterances
 *
 * Speaker ID convention emitted to UI:
 *   - "A", "B", "C", ...  when no name is available
 *   - "A|María Rivera|Conductora"  when a name (and optional role) was identified
 *
 * The display layer (formatSpeakerName) renders these as
 *   "Hablante A" or "María Rivera (Conductora)".
 */
export function parseTvSpeakerText(text: string): UtteranceTimestamp[] {
  if (!text || !text.trim()) return [];

  const utterances: UtteranceTimestamp[] = [];
  
  // First, clean the text from any analysis artifacts
  const cleanedText = cleanInputText(text);
  
  // Match each SPEAKER X: occurrence with its content until the next SPEAKER or end
  const speakerMatches = Array.from(
    cleanedText.matchAll(/SPEAKER\s+(\w+)(?:\s*\(([^)]+)\))?:\s*([^]*?)(?=SPEAKER\s+\w+|$)/gi)
  );

  let currentTime = 0;
  const averageSegmentDuration = 5000; // 5s placeholder per segment

  // Map raw token (e.g. "1", "A", "Maria") -> canonical letter ("A", "B", ...)
  const letterByRaw = new Map<string, string>();
  // Cache name/role per letter (first non-empty wins)
  const nameByLetter = new Map<string, { name: string; role: string }>();

  const assignLetter = (raw: string): string => {
    const key = raw.trim().toUpperCase();
    if (letterByRaw.has(key)) return letterByRaw.get(key)!;
    const letter = toLetter(key, letterByRaw.size);
    // Avoid collisions if two raw tokens map to the same letter
    let finalLetter = letter;
    const used = new Set(letterByRaw.values());
    let idx = letterByRaw.size;
    while (used.has(finalLetter)) {
      finalLetter = SPEAKER_LETTERS[Math.min(++idx, SPEAKER_LETTERS.length - 1)];
    }
    letterByRaw.set(key, finalLetter);
    return finalLetter;
  };

  const buildSpeakerId = (letter: string): string => {
    const meta = nameByLetter.get(letter);
    if (meta && meta.name) {
      return `${letter}|${meta.name}${meta.role ? `|${meta.role}` : ""}`;
    }
    return letter;
  };

  if (speakerMatches.length > 0) {
    speakerMatches.forEach((match) => {
      const rawSpeaker = match[1];
      const inParens = (match[2] || "").trim();
      const content = (match[3] || "").trim();

      if (!content || isAnalysisContent(content)) return;

      const letter = assignLetter(rawSpeaker);

      // Parse "Name - Role" or just "Name"
      if (inParens && !nameByLetter.has(letter)) {
        const dashIdx = inParens.indexOf(" - ");
        if (dashIdx > -1) {
          nameByLetter.set(letter, {
            name: inParens.slice(0, dashIdx).trim(),
            role: inParens.slice(dashIdx + 3).trim(),
          });
        } else {
          nameByLetter.set(letter, { name: inParens, role: "" });
        }
      }

      utterances.push({
        speaker: buildSpeakerId(letter),
        text: content,
        start: currentTime,
        end: currentTime + averageSegmentDuration,
      });
      currentTime += averageSegmentDuration;
    });

    // Second pass: backfill speaker IDs that were created before their name was known
    return utterances.map((u) => {
      const head = String(u.speaker).split("|")[0];
      return { ...u, speaker: buildSpeakerId(head) };
    });
  }

  // Fallback: no SPEAKER X: pattern — split paragraphs as a single unknown speaker
  cleanedText
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !isAnalysisContent(s))
    .forEach((segment) => {
      utterances.push({
        speaker: "A",
        text: segment,
        start: currentTime,
        end: currentTime + averageSegmentDuration,
      });
      currentTime += averageSegmentDuration;
    });

  return utterances;
}

/**
 * Enhanced cleaning of input text from analysis artifacts and mixed content
 */
function cleanInputText(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  // Enhanced JSON and structure artifacts removal
  cleaned = cleaned
    .replace(/[\{\}]/g, '')
    .replace(/"[^"]*":\s*/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/[\[\]]/g, '')
    .replace(/,\s*$/gm, '')
    .replace(/^\s*,/gm, '')
    .trim();
  
  // Remove enhanced analysis section markers and headers
  cleaned = cleaned
    .replace(/## PASO \d+:.*$/gmi, '')
    .replace(/## SECCIÓN \d+:.*$/gmi, '')
    .replace(/\*\*FORMATO OBLIGATORIO.*?\*\*/gs, '')
    .replace(/\*\*REGLAS ESTRICTAS.*?\*\*/gs, '')
    .replace(/\*\*EJEMPLO CORRECTO.*?\*\*/gs, '')
    .replace(/\[TIPO DE CONTENIDO:.*?\]/gi, '');
  
  // Remove instruction text and format guidelines
  const instructionPatterns = [
    /CRÍTICO - SOLO DIÁLOGOS.*?(?=SPEAKER|$)/gs,
    /Tu tarea principal.*?(?=SPEAKER|$)/gs,
    /FORMATO OBLIGATORIO.*?(?=SPEAKER|$)/gs,
    /REGLAS ESTRICTAS.*?(?=SPEAKER|$)/gs,
    /USA NOMBRES REALES.*?(?=SPEAKER|$)/gs,
    /NO incluyas análisis.*?(?=SPEAKER|$)/gs
  ];
  
  instructionPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned.trim();
}

/**
 * Enhanced check if content is analysis-related rather than transcription dialogue
 */
function isAnalysisContent(text: string): boolean {
  if (!text) return true;
  
  const analysisKeywords = [
    'transcription', 'visual_analysis', 'analysis', 'summary', 'keywords', 'segments',
    'transcripción', 'análisis', 'resumen', 'palabras', 'segmentos',
    'who', 'what', 'when', 'where', 'why', 'quién', 'qué', 'cuándo', 'dónde', 'por qué',
    'formato', 'reglas', 'ejemplo', 'paso', 'sección', 'crítico', 'obligatorio', 'estrictas'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Enhanced analysis field pattern detection
  const hasAnalysisPattern = analysisKeywords.some(keyword => 
    lowerText.startsWith(keyword + ':') || 
    lowerText.includes('"' + keyword + '"') ||
    lowerText.includes(keyword + '":') ||
    lowerText.includes(keyword + ' obligatorio') ||
    lowerText.includes(keyword + ' para')
  );
  
  // Enhanced JSON and instruction pattern detection
  const hasJsonPattern = text.includes('{') || text.includes('}') || 
                         text.includes('":') || text.startsWith('"');
                         
  const isInstruction = text.includes('**') || text.startsWith('##') || 
                       text.includes('FORMATO') || text.includes('REGLAS') ||
                       text.includes('EJEMPLO') || text.includes('PASO');
  
  // Check if it's too short or looks like metadata
  const isTooShort = text.trim().length < 10;
  
  // Check for content type markers
  const hasContentMarker = text.includes('[TIPO DE CONTENIDO:') || 
                          text.includes('[SECCIÓN') ||
                          text.includes('[PASO');
  
  return hasAnalysisPattern || hasJsonPattern || isTooShort || isInstruction || hasContentMarker;
}

/**
 * Map role names to speaker numbers for consistency
 */
function mapRoleToSpeakerNumber(role: string): string {
  const roleMap: { [key: string]: string } = {
    'PRESENTER': '1',
    'HOST': '1',
    'LOCUTOR': '1',
    'CONDUCTOR': '1',
    'GUEST': '2',
    'ENTREVISTADO': '2',
    'INVITADO': '2',
    'INVITADA': '2',
    'SPEAKER': '1',
  };
  
  return roleMap[role.toUpperCase()] || '1';
}

/**
 * Check if text contains TV-specific speaker patterns
 */
export function hasTvSpeakerPatterns(text: string): boolean {
  if (!text || !text.trim()) return false;
  
  const patterns = [
    // Standard speaker patterns (numbers and letters)
    /SPEAKER\s+\w+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /\[SPEAKER\s+\w+\]/i,
    /^\s*-\s*\w+:/m,
    
    // Enhanced patterns for better detection
    /^[A-ZÁÉÍÓÚÑÜ\s]{2,}:\s*/m,  // Generic "NAME: " pattern (caps)
    /CONDUCTOR:/i,
    /REPORTERO:|REPORTERA:/i,
    /INVITADO:|INVITADA:/i,
    /COMENTARISTA:/i,
    /ANALISTA:/i,
    /PERIODISTA:/i,
    
    // Role-based patterns
    /SPEAKER\s+\w+:\s*[A-ZÁÉÍÓÚÑÜ\s]+:/i,  // "SPEAKER 1: NAME:" or "SPEAKER A: NAME:"
    /^\d+\.\s*[A-ZÁÉÍÓÚÑÜ\s]+:/m,  // "1. NAME:"
    
    // Mixed format patterns
    /\[[A-ZÁÉÍÓÚÑÜ\s]+\]:/i,  // "[NAME]:"
    /-\s*[A-ZÁÉÍÓÚÑÜ\s]{2,}:/i  // "- NAME:"
  ];
  
  return patterns.some(pattern => pattern.test(text));
}