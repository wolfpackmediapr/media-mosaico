import type { SocialPost, ClientSpotlight, SpotlightArticle, MatchedTerm } from "@/types/social";
import type { Client } from "@/services/clients/clientService";

// Lightweight normalize that preserves spacing/punctuation, required so the
// word-boundary regex below works correctly. For pure equality checks use
// `normalizeText` from `@/lib/textNormalize`.
const normalize = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const MIN_KEYWORD_LEN = 4;

// Common honorifics/titles to strip so "Hon. Juan Pérez" matches "Juan Pérez"
const HONORIFIC_RE = /^(hon|lcdo|lcda|dr|dra|sr|sra|srta|sen|rep|ing|prof|mons|rev)\.?\s+/i;

const stripHonorifics = (s: string) => s.replace(HONORIFIC_RE, "").trim();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build a word-boundary regex for a normalized term. Uses lookarounds on
// non-letter/digit chars so multi-word terms still match correctly.
const buildTermRegex = (term: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, "iu");

export interface RawArticle {
  id: string;
  title: string | null;
  description: string | null;
  link: string | null;
  pub_date: string;
  source: string | null;
  image_url: string | null;
  feed_source_id: string | null;
  clients?: any;
  keywords?: string[] | null;
  summary?: string | null;
  feed_source?: any;
}

/**
 * Match articles to clients by:
 * - article.clients JSONB containing client name or id
 * - word-boundary, case/diacritic-insensitive match of client name
 *   (always searched in full) or keywords (>= 4 chars) inside
 *   title + description + summary + article keywords.
 */
export function matchArticlesToClients(
  clients: Client[],
  articles: RawArticle[],
  transform: (a: RawArticle) => SocialPost,
  maxArticlesPerClient = 3
): ClientSpotlight[] {
  const grouped = new Map<string, { client: Client; articles: SpotlightArticle[] }>();

  for (const article of articles) {
    const articleKeywords = Array.isArray(article.keywords) ? article.keywords.join(" ") : "";
    const haystack = normalize(
      `${article.title ?? ""} ${article.description ?? ""} ${article.summary ?? ""} ${articleKeywords}`
    );
    const clientsField = article.clients;
    const clientsArr: any[] = Array.isArray(clientsField)
      ? clientsField
      : clientsField && typeof clientsField === "object"
      ? Object.values(clientsField)
      : [];

    for (const client of clients) {
      if (!client.id) continue;
      const normName = normalize(stripHonorifics(client.name));
      // Always include the full client name (no min length); apply min length to keywords only.
      const keywordPairs = (client.keywords ?? [])
        .map((k) => ({ label: stripHonorifics(k), norm: normalize(stripHonorifics(k)) }))
        .filter((p) => p.norm.length >= MIN_KEYWORD_LEN);

      const jsonMatch = clientsArr.some((c) => {
        if (typeof c === "string")
          return normalize(stripHonorifics(c)) === normName || c === client.id;
        if (c && typeof c === "object")
          return (
            c.id === client.id ||
            (c.name && normalize(stripHonorifics(String(c.name))) === normName)
          );
        return false;
      });

      const matchedTerms: MatchedTerm[] = [];
      const seen = new Set<string>();
      const pushTerm = (label: string, type: MatchedTerm["type"]) => {
        const key = label.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        matchedTerms.push({ label, type });
      };

      if (normName && buildTermRegex(normName).test(haystack)) {
        pushTerm(stripHonorifics(client.name), "name");
      }
      for (const { label, norm } of keywordPairs) {
        if (buildTermRegex(norm).test(haystack)) pushTerm(label, "keyword");
      }

      const textMatch = matchedTerms.length > 0;

      if (jsonMatch || textMatch) {
        if (jsonMatch && matchedTerms.length === 0) {
          pushTerm(client.name, "ai");
        }
        if (!grouped.has(client.id)) grouped.set(client.id, { client, articles: [] });
        grouped.get(client.id)!.articles.push({ ...transform(article), matchedTerms });
      }
    }
  }

  return Array.from(grouped.values())
    .map(({ client, articles }) => {
      const sorted = articles.sort(
        (a, b) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime()
      );
      return {
        clientId: client.id!,
        clientName: client.name,
        category: client.category,
        matchCount: sorted.length,
        articles: sorted.slice(0, maxArticlesPerClient),
        allArticles: sorted,
      };
    })
    .sort((a, b) => b.matchCount - a.matchCount);
}