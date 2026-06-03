import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BuzzRange = "day" | "week" | "month";

export interface BuzzWord {
  text: string;
  value: number;
}

const RANGE_DAYS: Record<BuzzRange, number> = { day: 1, week: 7, month: 30 };

// Spanish + English stopwords (lowercased, accent-stripped)
const STOPWORDS = new Set<string>([
  // Spanish
  "para","pero","como","esta","este","estos","estas","todo","todos","todas","entre","sobre","tambien","desde","cuando","donde","hasta","mientras","porque","segun","puede","pueden","sera","seran","habia","habian","sido","esta","estan","estaba","estaban","ante","cada","otro","otra","otros","otras","muy","mas","menos","sino","solo","solos","tras","nuestra","nuestro","nuestros","nuestras","ellos","ellas","quien","quienes","cual","cuales","fueron","fuera","luego","aqui","alli","ahora","hoy","ayer","manana","dijo","dice","decir","dicen","tiene","tienen","tener","sera","ser","han","hay","fue","los","las","del","con","una","uno","por","que","sus","sin","les","los","est",
  // English
  "the","and","for","that","with","this","from","have","has","had","not","but","are","was","were","will","would","could","should","into","over","than","then","they","them","their","there","here","what","when","where","which","while","about","after","before","also","just","only","more","most","such","some","other","your","you","our","its","been","being","said","says","say","like","very","much","many","new","old","one","two",
]);

const tokenize = (s: string): string[] =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]*>/g, " ")
    .split(/[^a-z0-9ñ]+/i)
    .filter(Boolean);

async function fetchBuzzRows(range: BuzzRange) {
  const since = new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("news_articles")
    .select("title, description, keywords, source")
    .gte("pub_date", since)
    .order("pub_date", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data ?? [];
}

export function useBuzzWords(range: BuzzRange) {
  const query = useQuery({
    queryKey: ["buzz-words", range],
    queryFn: () => fetchBuzzRows(range),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const words = useMemo<BuzzWord[]>(() => {
    const rows = query.data;
    if (!rows || rows.length === 0) return [];
    const counts = new Map<string, number>();
    const sourceTokens = new Set<string>();

    for (const r of rows) {
      for (const t of tokenize((r as any).source ?? "")) sourceTokens.add(t);
    }

    const add = (raw: string) => {
      const tok = raw.trim();
      if (!tok) return;
      if (tok.length < 4) return;
      if (/^\d+$/.test(tok)) return;
      if (STOPWORDS.has(tok)) return;
      if (sourceTokens.has(tok)) return;
      counts.set(tok, (counts.get(tok) ?? 0) + 1);
    };

    for (const r of rows) {
      const kw = (r as any).keywords;
      if (Array.isArray(kw) && kw.length > 0) {
        for (const k of kw) {
          if (typeof k !== "string") continue;
          // keywords may be phrases; keep multi-word as-is, normalized
          const norm = k
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          if (norm.length >= 3 && !/^\d+$/.test(norm) && !STOPWORDS.has(norm)) {
            counts.set(norm, (counts.get(norm) ?? 0) + 2); // boost AI keywords
          }
        }
      } else {
        const text = `${(r as any).title ?? ""} ${(r as any).description ?? ""}`;
        for (const tok of tokenize(text)) add(tok);
      }
    }

    return Array.from(counts.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 60);
  }, [query.data]);

  return { words, isLoading: query.isLoading, isFetching: query.isFetching, error: query.error };
}