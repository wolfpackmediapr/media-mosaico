/**
 * SHADOW-ONLY adapter over the EXISTING legacy AI response — CP5-C4A.3.
 *
 * The legacy authoritative AI prompt and its `{id, name, relevance}` output
 * contract are unchanged in this phase. For shadow comparison we reuse that
 * SAME already-obtained response (0 extra AI calls) and extract ONLY the
 * name nominations from it.
 *
 * Explicitly discarded: AI `id`, AI `relevance`, and any other AI field.
 * The shadow proposal never trusts a model-supplied identifier.
 */

export const MAX_LEGACY_NOMINATIONS = 50;
export const MAX_LEGACY_NAME_LENGTH = 120;

export interface LegacyAdapterResult {
  /** Trimmed, deduplicated name nominations. */
  names: string[];
  /** Count of entries dropped because they carried no usable name. */
  droppedCount: number;
  /** Count of entries that carried an id (ignored by contract). */
  ignoredIdCount: number;
}

function dedupeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts name-only nominations from the PRE-MERGE legacy AI client array.
 *
 * Must be fed the raw AI array, never the merged authoritative `clients[]`:
 * the merged array mixes deterministic and AI provenance and would invalidate
 * the shadow comparison.
 */
export function extractLegacyAiNames(rawAiClients: unknown): LegacyAdapterResult {
  const names: string[] = [];
  const seen = new Set<string>();
  let droppedCount = 0;
  let ignoredIdCount = 0;

  if (!Array.isArray(rawAiClients)) {
    return { names, droppedCount, ignoredIdCount };
  }

  for (const entry of rawAiClients.slice(0, MAX_LEGACY_NOMINATIONS)) {
    let candidate: string | null = null;

    if (typeof entry === "string") {
      candidate = entry;
    } else if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      if ("id" in obj) ignoredIdCount++;
      // `relevance` and every other field are deliberately ignored.
      if (typeof obj.name === "string") candidate = obj.name;
    }

    const trimmed = (candidate ?? "").trim();
    if (!trimmed || trimmed.length > MAX_LEGACY_NAME_LENGTH) {
      droppedCount++;
      continue;
    }
    const key = dedupeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
  }

  return { names, droppedCount, ignoredIdCount };
}
