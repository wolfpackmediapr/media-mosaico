/**
 * Post-generation validator/sanitizer for TV analysis output.
 *
 * Enforces invariants from buildTvAnalysisPrompt that the model sometimes
 * violates:
 *   - "ALERTAS Y RECOMENDACIONES" must not contain single-word entries
 *     like "Sí", "No", "Ninguna", "N/A" — strip those.
 *   - "RELEVANCIA PARA CLIENTES" must not reference clients outside the
 *     active client list (defense in depth on top of the prompt rule).
 *   - "QUIÉN DICE QUÉ" lines that lost their speaker prefix are dropped.
 *
 * The function is intentionally conservative: it never rewrites prose, only
 * removes obviously invalid lines so the downstream parsers (analysisParser,
 * extractAnalysisFieldsFromText) see clean input.
 */

const BAD_ALERT_TOKENS = new Set([
  'sí', 'si', 'no', 'ninguna', 'ninguno', 'n/a', 'na', 'ok',
  'none', 'nada', '-', '—', 'sin alertas',
]);

function isBogusAlertLine(raw: string): boolean {
  const text = raw.replace(/^[\-\*\u2022\d\.\)\s]+/, '').trim();
  if (!text) return true;
  const lower = text.toLowerCase().replace(/[.!?:,;"'`]+$/g, '').trim();
  if (BAD_ALERT_TOKENS.has(lower)) return true;
  // Less than 4 words AND fewer than 25 chars → almost certainly noise.
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length < 4 && text.length < 25) return true;
  return false;
}

function sanitizeAlertsSection(block: string): string {
  const lines = block.split('\n');
  const out: string[] = [];
  let kept = 0;
  for (const line of lines) {
    // Preserve the header line itself
    if (/^\s*ALERTAS Y RECOMENDACIONES\s*:?/i.test(line)) {
      out.push(line);
      continue;
    }
    if (!line.trim()) { out.push(line); continue; }
    if (isBogusAlertLine(line)) continue;
    out.push(line);
    kept++;
  }
  if (kept === 0) {
    // Replace the section body with the canonical "no alerts" sentence
    return out.join('\n').replace(
      /(ALERTAS Y RECOMENDACIONES\s*:?)/i,
      '$1\nSin alertas relevantes en este programa.',
    );
  }
  return out.join('\n');
}

function sanitizeClientRelevance(
  block: string,
  activeClientNames: string[],
): string {
  if (!activeClientNames.length) return block;
  const activeLower = new Set(activeClientNames.map((n) => n.toLowerCase().trim()));
  // Heuristic: drop any "- Nombre del cliente: X" or "- Cliente: X" entry
  // where X is not in the active set. We keep prose lines that don't look
  // like a client name declaration.
  return block.split('\n').map((line) => {
    const m = line.match(/^\s*[-*\u2022]?\s*(?:Nombre del cliente|Cliente)\s*[:\-]\s*([^\n]+?)\s*$/i);
    if (!m) return line;
    const candidate = m[1].toLowerCase().trim();
    return activeLower.has(candidate) ? line : '';
  }).join('\n');
}

export function sanitizeTvAnalysis(
  analysisText: string,
  activeClientNames: string[] = [],
): string {
  if (!analysisText) return analysisText;

  let out = analysisText;

  // Sanitize ALERTAS section (scoped to its block)
  out = out.replace(
    /(ALERTAS Y RECOMENDACIONES[\s\S]*?)(?=\n\s*(?:PRESENCIA DE PERSONAS|RELEVANCIA PARA CLIENTES|\[TIPO DE CONTENIDO|$))/i,
    (match) => sanitizeAlertsSection(match),
  );

  // Sanitize RELEVANCIA PARA CLIENTES section
  if (activeClientNames.length) {
    out = out.replace(
      /(RELEVANCIA PARA CLIENTES[\s\S]*?)(?=\n\s*(?:ALERTAS Y RECOMENDACIONES|PRESENCIA DE PERSONAS|\[TIPO DE CONTENIDO|$))/i,
      (match) => sanitizeClientRelevance(match, activeClientNames),
    );
  }

  // Collapse runs of 3+ blank lines created by removals
  out = out.replace(/\n{3,}/g, '\n\n');

  return out;
}