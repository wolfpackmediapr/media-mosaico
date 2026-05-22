import type { SocialPost, ClientSpotlight } from "@/types/social";
import type { Client } from "@/services/clients/clientService";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const MIN_KEYWORD_LEN = 3;

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
  feed_source?: any;
}

/**
 * Match articles to clients by:
 * - article.clients JSONB containing client name or id
 * - case/diacritic-insensitive substring of client name or keywords
 *   (>= 3 chars) inside title + description
 */
export function matchArticlesToClients(
  clients: Client[],
  articles: RawArticle[],
  transform: (a: RawArticle) => SocialPost,
  maxArticlesPerClient = 3
): ClientSpotlight[] {
  const grouped = new Map<string, { client: Client; articles: SocialPost[] }>();

  for (const article of articles) {
    const haystack = normalize(`${article.title ?? ""} ${article.description ?? ""}`);
    const clientsField = article.clients;
    const clientsArr: any[] = Array.isArray(clientsField)
      ? clientsField
      : clientsField && typeof clientsField === "object"
      ? Object.values(clientsField)
      : [];

    for (const client of clients) {
      if (!client.id) continue;
      const normName = normalize(client.name);
      const terms = [normName, ...(client.keywords ?? []).map(normalize)].filter(
        (t) => t.length >= MIN_KEYWORD_LEN
      );

      const jsonMatch = clientsArr.some((c) => {
        if (typeof c === "string") return normalize(c) === normName || c === client.id;
        if (c && typeof c === "object")
          return c.id === client.id || (c.name && normalize(c.name) === normName);
        return false;
      });

      const textMatch = !jsonMatch && terms.some((t) => haystack.includes(t));

      if (jsonMatch || textMatch) {
        if (!grouped.has(client.id)) grouped.set(client.id, { client, articles: [] });
        grouped.get(client.id)!.articles.push(transform(article));
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