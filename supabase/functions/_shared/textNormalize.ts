/**
 * Shared text normalization helpers for accent/case-insensitive matching.
 * Used across edge functions so client keywords don't need duplicate
 * accented + non-accented variants.
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
 * Uses Unicode lookarounds so multi-word terms still match correctly and
 * partials like "paz" don't match "capaz".
 */
export const matchesKeyword = (haystack: string, keyword: string): boolean => {
  const h = normalizeText(haystack);
  const k = normalizeText(keyword);
  if (!h || !k) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(k)}(?![\\p{L}\\p{N}])`, "iu");
  return re.test(h);
};