/**
 * FUTURE (DORMANT) strict AI client-nomination contract — CP5-C4A.3.
 *
 * This module is NOT wired into any production processing path in C4A.3.
 * It exists so the future name-only AI contract can be reviewed and tested
 * ahead of a separate, explicitly approved activation phase.
 *
 * Contract:
 *   { "client_names": ["Metropistas", "PROMESA"] }
 *
 * The AI may nominate NAMES ONLY. It never supplies ids or relevance.
 */

export const MAX_CLIENT_NOMINATIONS = 25;
export const MAX_CLIENT_NAME_LENGTH = 120;

export interface AiNominationValidation {
  ok: boolean;
  /** Trimmed, deduplicated nominations (empty when rejected). */
  names: string[];
  errors: string[];
  /** Diagnostic counters; never used to authorize anything. */
  rejectedCount: number;
}

const ALLOWED_FIELDS = new Set(["client_names"]);

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strict runtime validation of a future AI response. Rejects malformed
 * payloads outright; never lets arbitrary AI fields flow onward.
 */
export function validateAiClientNames(raw: unknown): AiNominationValidation {
  const errors: string[] = [];
  let rejectedCount = 0;

  if (raw === null || raw === undefined) {
    return { ok: true, names: [], errors: [], rejectedCount: 0 };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, names: [], errors: ["root_not_object"], rejectedCount: 0 };
  }

  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_FIELDS.has(key)) errors.push(`unknown_field:${key}`);
  }
  if (errors.length > 0) return { ok: false, names: [], errors, rejectedCount: 0 };

  const value = obj.client_names;
  if (value === undefined || value === null) {
    return { ok: true, names: [], errors: [], rejectedCount: 0 };
  }
  if (!Array.isArray(value)) {
    return { ok: false, names: [], errors: ["client_names_not_array"], rejectedCount: 0 };
  }
  if (value.length > MAX_CLIENT_NOMINATIONS) {
    return { ok: false, names: [], errors: ["too_many_nominations"], rejectedCount: value.length };
  }

  const seen = new Set<string>();
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      rejectedCount++;
      errors.push("non_string_nomination");
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      rejectedCount++;
      errors.push("empty_nomination");
      continue;
    }
    if (trimmed.length > MAX_CLIENT_NAME_LENGTH) {
      rejectedCount++;
      errors.push("nomination_too_long");
      continue;
    }
    const key = normalizeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
  }

  return { ok: true, names, errors, rejectedCount };
}
