import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { matchArticlesToClients, type RawArticle } from "@/services/social/clientMatcher";
import { transformArticlesToPosts } from "@/services/social/utils";
import type { ClientSpotlight } from "@/types/social";
import type { Client } from "@/services/clients/clientService";

const DAYS = 30;
const ARTICLE_LIMIT = 1000;

async function fetchSpotlights(): Promise<ClientSpotlight[]> {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: clients, error: clientsErr }, { data: articles, error: articlesErr }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, category, keywords, is_active")
        .eq("is_active", true),
      supabase
        .from("news_articles")
        .select(
          "id, title, description, link, pub_date, source, image_url, feed_source_id, clients, keywords, feed_source:feed_sources(name, platform, platform_display_name, platform_icon)"
        )
        .gte("pub_date", since)
        .order("pub_date", { ascending: false })
        .limit(ARTICLE_LIMIT),
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

export function useClientSpotlight() {
  return useQuery({
    queryKey: ["client-spotlight", `${DAYS}d`],
    queryFn: fetchSpotlights,
    staleTime: 60_000,
  });
}