/**
 * Shared text normalization helpers for accent/case-insensitive matching.
 * Mirror of supabase/functions/_shared/textNormalize.ts so frontend and
 * edge functions share the same matching semantics.
 */

export const normalizeText = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Word-boundary, accent/case-insensitive substring match.
 */
export const matchesKeyword = (haystack: string, keyword: string): boolean => {
  const h = normalizeText(haystack);
  const k = normalizeText(keyword);
  if (!h || !k) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(k)}(?![\\p{L}\\p{N}])`, "iu");
  return re.test(h);
};