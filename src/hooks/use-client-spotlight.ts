import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { matchArticlesToClients, type RawArticle } from "@/services/social/clientMatcher";
import { transformArticlesToPosts } from "@/services/social/utils";
import { SOCIAL_PLATFORMS } from "@/services/social/api";
import type { ClientSpotlight } from "@/types/social";
import type { Client } from "@/services/clients/clientService";

const DAYS = 30;
const ARTICLE_LIMIT = 1000;

export type SpotlightScope = "all" | "news" | "social";

async function fetchSpotlights(scope: SpotlightScope): Promise<ClientSpotlight[]> {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Pre-filter feed sources by scope to scope the article query
  let allowedFeedIds: string[] | null = null;
  if (scope !== "all") {
    const fsQuery = supabase.from("feed_sources").select("id, platform");
    const { data: fs, error: fsErr } = await fsQuery;
    if (fsErr) throw fsErr;
    allowedFeedIds = (fs ?? [])
      .filter((f: any) =>
        scope === "social"
          ? SOCIAL_PLATFORMS.includes(f.platform)
          : !SOCIAL_PLATFORMS.includes(f.platform) // news: anything that isn't social (incl. null)
      )
      .map((f: any) => f.id);
  }

  let articlesQuery = supabase
    .from("news_articles")
    .select(
      "id, title, description, summary, link, pub_date, source, image_url, feed_source_id, clients, keywords, feed_source:feed_sources(name, platform, platform_display_name, platform_icon)"
    )
    .gte("pub_date", since)
    .order("pub_date", { ascending: false })
    .limit(ARTICLE_LIMIT);

  if (allowedFeedIds) {
    if (allowedFeedIds.length === 0) return [];
    articlesQuery = articlesQuery.in("feed_source_id", allowedFeedIds);
  }

  const [{ data: clients, error: clientsErr }, { data: articles, error: articlesErr }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, category, keywords, is_active")
        .eq("is_active", true),
      articlesQuery,
    ]);

  if (clientsErr) throw clientsErr;
  if (articlesErr) throw articlesErr;

  const transform = (a: RawArticle) => transformArticlesToPosts([a])[0];
  return matchArticlesToClients(
    (clients ?? []) as Client[],
    (articles ?? []) as RawArticle[],
    transform
  );
}

export function useClientSpotlight(scope: SpotlightScope = "all") {
  return useQuery({
    queryKey: ["client-spotlight", "v3", `${DAYS}d`, scope],
    queryFn: () => fetchSpotlights(scope),
    staleTime: 60_000,
  });
}