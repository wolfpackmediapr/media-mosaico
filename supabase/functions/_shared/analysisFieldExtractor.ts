// Shared extractor that turns a narrative Spanish AI analysis into the
// structured columns used by both tv_transcriptions and radio_transcriptions.
// Keeping this in _shared guarantees TV and Radio store the same field names,
// so analyses stay queryable across both media types.

export interface ExtractedAnalysisFields {
  analysis_summary?: string;
  analysis_quien?: string;
  analysis_que?: string;
  analysis_cuando?: string;
  analysis_donde?: string;
  analysis_porque?: string;
  analysis_category?: string;
  analysis_keywords?: string[];
  analysis_client_relevance?: unknown;
}

function extract5W(text: string, label: string): string | undefined {
  const patterns = [
    new RegExp(`\\*\\*${label}\\*\\*[:\\s]*([^\\n]+)`, 'i'),
    new RegExp(`${label}[:\\s]+([^\\n]+)`, 'i'),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const value = m[1].trim().replace(/^\*\*|\*\*$/g, '').trim();
      if (value.length > 1) return value.substring(0, 2000);
    }
  }
  return undefined;
}

/**
 * Pulls the client names the analysis flagged as relevant.
 * Only names present in `knownClients` are kept, so hallucinated names and
 * "no hay clientes relevantes" style sentences never reach the database.
 */
export function extractRelevantClients(text: string, knownClients: string[]): string[] {
  if (!text || knownClients.length === 0) return [];
  const haystack = text.toLowerCase();
  const matched = new Set<string>();
  for (const name of knownClients) {
    const trimmed = (name || '').trim();
    if (trimmed.length < 3) continue;
    if (haystack.includes(trimmed.toLowerCase())) matched.add(trimmed);
  }
  return Array.from(matched).sort();
}

export function extractAnalysisFields(
  text: string,
  knownClients: string[] = [],
): ExtractedAnalysisFields {
  const fields: ExtractedAnalysisFields = {};
  if (!text || text.startsWith('Error en análisis')) return fields;

  const quien = extract5W(text, 'QUI[EÉ]N(?:ES)?');
  const que = extract5W(text, 'QU[EÉ]');
  const cuando = extract5W(text, 'CU[AÁ]NDO');
  const donde = extract5W(text, 'D[OÓ]NDE');
  const porque = extract5W(text, 'POR\\s*QU[EÉ]');
  if (quien) fields.analysis_quien = quien;
  if (que) fields.analysis_que = que;
  if (cuando) fields.analysis_cuando = cuando;
  if (donde) fields.analysis_donde = donde;
  if (porque) fields.analysis_porque = porque;

  const resumenMatch = text.match(
    /(?:Resumen|RESUMEN)[^:\n]*:?\s*\n?([\s\S]*?)(?=\n(?:\d+\.|Temas|TEMAS|Tono|TONO|Categor|CATEGOR|An[aá]lisis|ANÁLISIS|Palabras|PALABRAS|Puntuaci|PUNTUACI|Alertas|ALERTAS|Clientes|CLIENTES|\[TIPO)|$)/i,
  );
  if (resumenMatch && resumenMatch[1]) {
    const summary = resumenMatch[1].trim().substring(0, 4000);
    if (summary.length > 20) fields.analysis_summary = summary;
  }

  const catMatch =
    text.match(/Categor[ií]a(?:s)?\s+(?:principal|aplicable)[^:\n]*:\s*([^\n]+)/i) ||
    text.match(/Categor[ií]a(?:s)?[^:\n]*:\s*([^\n]+)/i);
  if (catMatch && catMatch[1]) {
    const cat = catMatch[1].trim().replace(/^\*\*|\*\*$/g, '').trim();
    if (cat.length > 1) fields.analysis_category = cat.substring(0, 200);
  }

  const kwMatch = text.match(/Palabras\s+clave[^:\n]*:\s*([^\n]+)/i);
  if (kwMatch && kwMatch[1]) {
    const kws = kwMatch[1]
      .split(/[,;]/)
      .map((k: string) => k.trim().replace(/^[-•*]\s*/, '').replace(/^\*\*|\*\*$/g, '').trim())
      .filter((k: string) => k.length > 1 && k.length < 80);
    if (kws.length > 0) fields.analysis_keywords = kws.slice(0, 40);
  }

  const relevant = extractRelevantClients(text, knownClients);
  if (relevant.length > 0) {
    fields.analysis_client_relevance = relevant.map((name) => ({ name, source: 'analysis' }));
  }

  return fields;
}
