import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format, startOfWeek, subWeeks } from "date-fns";

interface DashboardStats {
  prensaDigital: {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
    total: number;
    trend: number;
  };
  radio: {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
    total: number;
    trend: number;
  };
  prensaEscrita: {
    total: number;
    thisWeek: number;
  };
  feeds: {
    active: number;
    withErrors: number;
    total: number;
  };
  clients: {
    total: number;
  };
  alerts: {
    unread: number;
    total: number;
  };
}

interface ContentActivityData {
  date: string;
  prensaDigital: number;
  radio: number;
  prensaEscrita: number;
}

interface SourceDistribution {
  name: string;
  value: number;
  fill: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

interface RecentActivity {
  id: string;
  type: 'article' | 'radio' | 'press';
  title: string;
  source?: string;
  timestamp: string;
}

interface FeedHealth {
  id: string;
  name: string;
  active: boolean;
  errorCount: number;
  lastSuccessfulFetch: string | null;
  lastFetchError: string | null;
}

interface ClientKeyword {
  id: string;
  name: string;
  category: string;
  keywords: string[];
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = startOfDay(new Date());
      const yesterday = startOfDay(subDays(new Date(), 1));
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
      const lastWeekEnd = startOfWeek(new Date(), { weekStartsOn: 1 });

      // Parallel queries for all stats
      const [
        articlesToday,
        articlesYesterday,
        articlesThisWeek,
        articlesLastWeek,
        articlesTotal,
        radioToday,
        radioYesterday,
        radioThisWeek,
        radioLastWeek,
        radioTotal,
        pressTotal,
        pressThisWeek,
        feedsData,
        clientsTotal,
        alertsData
      ] = await Promise.all([
        // Prensa Digital stats
        supabase.from('news_articles').select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('news_articles').select('id', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString()),
        supabase.from('news_articles').select('id', { count: 'exact', head: true })
          .gte('created_at', thisWeekStart.toISOString()),
        supabase.from('news_articles').select('id', { count: 'exact', head: true })
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', lastWeekEnd.toISOString()),
        supabase.from('news_articles').select('id', { count: 'exact', head: true }),
        
        // Radio stats
        supabase.from('transcriptions').select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('transcriptions').select('id', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString()),
        supabase.from('transcriptions').select('id', { count: 'exact', head: true })
          .gte('created_at', thisWeekStart.toISOString()),
        supabase.from('transcriptions').select('id', { count: 'exact', head: true })
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', lastWeekEnd.toISOString()),
        supabase.from('transcriptions').select('id', { count: 'exact', head: true }),
        
        // Prensa Escrita stats
        supabase.from('press_clippings').select('id', { count: 'exact', head: true }),
        supabase.from('press_clippings').select('id', { count: 'exact', head: true })
          .gte('created_at', thisWeekStart.toISOString()),
        
        // Feeds stats
        supabase.from('feed_sources').select('id, active, error_count'),
        
        // Clients stats
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        
        // Alerts stats
        supabase.from('client_alerts').select('id, read_at', { count: 'exact' })
      ]);

      const feeds = feedsData.data || [];
      const alerts = alertsData.data || [];

      return {
        prensaDigital: {
          today: articlesToday.count || 0,
          yesterday: articlesYesterday.count || 0,
          thisWeek: articlesThisWeek.count || 0,
          lastWeek: articlesLastWeek.count || 0,
          total: articlesTotal.count || 0,
          trend: calculateTrend(articlesToday.count || 0, articlesYesterday.count || 0),
        },
        radio: {
          today: radioToday.count || 0,
          yesterday: radioYesterday.count || 0,
          thisWeek: radioThisWeek.count || 0,
          lastWeek: radioLastWeek.count || 0,
          total: radioTotal.count || 0,
          trend: calculateTrend(radioToday.count || 0, radioYesterday.count || 0),
        },
        prensaEscrita: {
          total: pressTotal.count || 0,
          thisWeek: pressThisWeek.count || 0,
        },
        feeds: {
          active: feeds.filter(f => f.active).length,
          withErrors: feeds.filter(f => (f.error_count || 0) > 0).length,
          total: feeds.length,
        },
        clients: {
          total: clientsTotal.count || 0,
        },
        alerts: {
          unread: alerts.filter(a => !a.read_at).length,
          total: alertsData.count || 0,
        },
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
}

export function useContentActivity() {
  return useQuery({
    queryKey: ['dashboard-content-activity'],
    queryFn: async (): Promise<ContentActivityData[]> => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'yyyy-MM-dd'),
          label: format(date, 'EEE'),
          start: startOfDay(date).toISOString(),
          end: startOfDay(subDays(date, -1)).toISOString(),
        };
      });

      const results = await Promise.all(
        days.map(async (day) => {
          const [articles, radio, press] = await Promise.all([
            supabase.from('news_articles').select('id', { count: 'exact', head: true })
              .gte('created_at', day.start)
              .lt('created_at', day.end),
            supabase.from('transcriptions').select('id', { count: 'exact', head: true })
              .gte('created_at', day.start)
              .lt('created_at', day.end),
            supabase.from('press_clippings').select('id', { count: 'exact', head: true })
              .gte('created_at', day.start)
              .lt('created_at', day.end),
          ]);

          return {
            date: day.label,
            prensaDigital: articles.count || 0,
            radio: radio.count || 0,
            prensaEscrita: press.count || 0,
          };
        })
      );

      return results;
    },
    staleTime: 60000,
  });
}

export function useSourceDistribution() {
  return useQuery({
    queryKey: ['dashboard-source-distribution'],
    queryFn: async (): Promise<SourceDistribution[]> => {
      const { data: articles } = await supabase
        .from('news_articles')
        .select('source')
        .limit(1000);

      if (!articles) return [];

      // Count articles by source
      const sourceCounts: Record<string, number> = {};
      articles.forEach(article => {
        const source = article.source || 'Desconocido';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      // Sort and get top 5
      const sorted = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return sorted.map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }));
    },
    staleTime: 300000,
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ['dashboard-category-breakdown'],
    queryFn: async (): Promise<CategoryBreakdown[]> => {
      const { data: articles } = await supabase
        .from('news_articles')
        .select('category')
        .limit(1000);

      if (!articles) return [];

      // Count articles by category
      const categoryCounts: Record<string, number> = {};
      articles.forEach(article => {
        const category = article.category || 'OTRAS';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      // Sort and get top 10
      return Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }));
    },
    staleTime: 300000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      const [articles, radio, press] = await Promise.all([
        supabase.from('news_articles')
          .select('id, title, source, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('transcriptions')
          .select('id, channel, program, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('press_clippings')
          .select('id, title, publication_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const activities: RecentActivity[] = [
        ...(articles.data || []).map(a => ({
          id: a.id,
          type: 'article' as const,
          title: a.title,
          source: a.source,
          timestamp: a.created_at,
        })),
        ...(radio.data || []).map(r => ({
          id: r.id,
          type: 'radio' as const,
          title: r.program || 'Transcripción de Radio',
          source: r.channel || undefined,
          timestamp: r.created_at,
        })),
        ...(press.data || []).map(p => ({
          id: p.id,
          type: 'press' as const,
          title: p.title,
          source: p.publication_name,
          timestamp: p.created_at,
        })),
      ];

      // Sort by timestamp and take top 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    staleTime: 30000,
  });
}

export function useFeedHealth() {
  return useQuery({
    queryKey: ['dashboard-feed-health'],
    queryFn: async (): Promise<FeedHealth[]> => {
      const { data } = await supabase
        .from('feed_sources')
        .select('id, name, active, error_count, last_successful_fetch, last_fetch_error')
        .order('name');

      return (data || []).map(feed => ({
        id: feed.id,
        name: feed.name,
        active: feed.active || false,
        errorCount: feed.error_count || 0,
        lastSuccessfulFetch: feed.last_successful_fetch,
        lastFetchError: feed.last_fetch_error,
      }));
    },
    staleTime: 60000,
  });
}

export function useClientKeywords() {
  return useQuery({
    queryKey: ['dashboard-client-keywords'],
    queryFn: async (): Promise<ClientKeyword[]> => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, category, keywords')
        .order('name')
        .limit(10);

      return (data || []).map(client => ({
        id: client.id,
        name: client.name,
        category: client.category,
        keywords: client.keywords || [],
      }));
    },
    staleTime: 300000,
  });
}
