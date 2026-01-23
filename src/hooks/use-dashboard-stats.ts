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
  tv: {
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
  tv: number;
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
  type: 'article' | 'radio' | 'tv' | 'press';
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

export function useDashboardStats(dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['dashboard-stats', dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<DashboardStats> => {
      // Use date range if provided, otherwise default to last 7 days
      const rangeEnd = dateTo || new Date();
      const rangeStart = dateFrom || subDays(startOfDay(new Date()), 6);
      
      // Calculate previous period for trend (same duration before the range)
      const rangeDuration = rangeEnd.getTime() - rangeStart.getTime();
      const previousEnd = new Date(rangeStart.getTime());
      const previousStart = new Date(rangeStart.getTime() - rangeDuration);

      // Parallel queries for all stats - using limit(1) instead of head:true for reliability
      const [
        articlesInRange,
        articlesPrevious,
        articlesTotal,
        radioInRange,
        radioPrevious,
        radioTotal,
        tvInRange,
        tvPrevious,
        tvTotal,
        pressInRange,
        pressPrevious,
        pressTotal,
        feedsData,
        clientsTotal,
        alertsData
      ] = await Promise.all([
          // Prensa Digital stats - using limit(1) for faster responses
          supabase.from('news_articles').select('id', { count: 'exact' })
            .gte('created_at', rangeStart.toISOString())
            .lte('created_at', rangeEnd.toISOString())
            .limit(1),
          supabase.from('news_articles').select('id', { count: 'exact' })
            .gte('created_at', previousStart.toISOString())
            .lt('created_at', previousEnd.toISOString())
            .limit(1),
          supabase.from('news_articles').select('id', { count: 'exact' }).limit(1),
          
          // Radio stats
          supabase.from('transcriptions').select('id', { count: 'exact' })
            .gte('created_at', rangeStart.toISOString())
            .lte('created_at', rangeEnd.toISOString())
            .limit(1),
          supabase.from('transcriptions').select('id', { count: 'exact' })
            .gte('created_at', previousStart.toISOString())
            .lt('created_at', previousEnd.toISOString())
            .limit(1),
          supabase.from('transcriptions').select('id', { count: 'exact' }).limit(1),
          
          // TV stats
          supabase.from('tv_transcriptions').select('id', { count: 'exact' })
            .gte('created_at', rangeStart.toISOString())
            .lte('created_at', rangeEnd.toISOString())
            .limit(1),
          supabase.from('tv_transcriptions').select('id', { count: 'exact' })
            .gte('created_at', previousStart.toISOString())
            .lt('created_at', previousEnd.toISOString())
            .limit(1),
          supabase.from('tv_transcriptions').select('id', { count: 'exact' }).limit(1),
          
          // Prensa Escrita stats
          supabase.from('press_clippings').select('id', { count: 'exact' })
            .gte('created_at', rangeStart.toISOString())
            .lte('created_at', rangeEnd.toISOString())
            .limit(1),
          supabase.from('press_clippings').select('id', { count: 'exact' })
            .gte('created_at', previousStart.toISOString())
            .lt('created_at', previousEnd.toISOString())
            .limit(1),
          supabase.from('press_clippings').select('id', { count: 'exact' }).limit(1),
          
          // Feeds stats
          supabase.from('feed_sources').select('id, active, error_count'),
          
          // Clients stats
          supabase.from('clients').select('id', { count: 'exact' }).limit(1),
          
          // Alerts stats
          supabase.from('client_alerts').select('id, read_at', { count: 'exact' })
        ]);

        const feeds = feedsData.data || [];
        const alerts = alertsData.data || [];

        return {
          prensaDigital: {
            today: articlesInRange.count || 0,
            yesterday: articlesPrevious.count || 0,
            thisWeek: articlesInRange.count || 0,
            lastWeek: articlesPrevious.count || 0,
            total: articlesTotal.count || 0,
            trend: calculateTrend(articlesInRange.count || 0, articlesPrevious.count || 0),
          },
          radio: {
            today: radioInRange.count || 0,
            yesterday: radioPrevious.count || 0,
            thisWeek: radioInRange.count || 0,
            lastWeek: radioPrevious.count || 0,
            total: radioTotal.count || 0,
            trend: calculateTrend(radioInRange.count || 0, radioPrevious.count || 0),
          },
          tv: {
            today: tvInRange.count || 0,
            yesterday: tvPrevious.count || 0,
            thisWeek: tvInRange.count || 0,
            lastWeek: tvPrevious.count || 0,
            total: tvTotal.count || 0,
            trend: calculateTrend(tvInRange.count || 0, tvPrevious.count || 0),
          },
          prensaEscrita: {
            total: pressTotal.count || 0,
            thisWeek: pressInRange.count || 0,
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
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useContentActivity(dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['dashboard-content-activity', dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<ContentActivityData[]> => {
      // Calculate days based on date range
      
      // Calculate days based on date range
      const rangeEnd = dateTo || new Date();
      const rangeStart = dateFrom || subDays(startOfDay(new Date()), 6);
      
      // Calculate the number of days in the range (max 14 for readability)
      const daysDiff = Math.min(
        Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        14
      );
      
      const days = Array.from({ length: daysDiff }, (_, i) => {
        const date = subDays(rangeEnd, daysDiff - 1 - i);
        return {
          date: format(date, 'yyyy-MM-dd'),
          label: format(date, 'dd/MM'),
          start: startOfDay(date).toISOString(),
          end: startOfDay(subDays(date, -1)).toISOString(),
        };
      });

      // Process days sequentially to avoid request overload
      const results: ContentActivityData[] = [];
      
      for (const day of days) {
        const [articles, radio, tv, press] = await Promise.all([
          supabase.from('news_articles').select('id', { count: 'exact' })
            .gte('created_at', day.start)
            .lt('created_at', day.end)
            .limit(1),
          supabase.from('transcriptions').select('id', { count: 'exact' })
            .gte('created_at', day.start)
            .lt('created_at', day.end)
            .limit(1),
          supabase.from('tv_transcriptions').select('id', { count: 'exact' })
            .gte('created_at', day.start)
            .lt('created_at', day.end)
            .limit(1),
          supabase.from('press_clippings').select('id', { count: 'exact' })
            .gte('created_at', day.start)
            .lt('created_at', day.end)
            .limit(1),
        ]);

        results.push({
          date: day.label,
          prensaDigital: articles.count || 0,
          radio: radio.count || 0,
          tv: tv.count || 0,
          prensaEscrita: press.count || 0,
        });
      }

      return results;
      return results;
    },
    staleTime: 60000,
  });
}

export function useSourceDistribution(dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['dashboard-source-distribution', dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<SourceDistribution[]> => {
      let query = supabase
        .from('news_articles')
        .select('source')
        .limit(1000);

      // Apply date filter if provided
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data: articles } = await query;

      if (!articles) return [];

      const sourceCounts: Record<string, number> = {};
      articles.forEach(article => {
        const source = article.source || 'Desconocido';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

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

export function useCategoryBreakdown(dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['dashboard-category-breakdown', dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async (): Promise<CategoryBreakdown[]> => {
      let query = supabase
        .from('news_articles')
        .select('category')
        .limit(1000);

      // Apply date filter if provided
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data: articles } = await query;

      if (!articles) return [];

      const categoryCounts: Record<string, number> = {};
      articles.forEach(article => {
        const category = article.category || 'OTRAS';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

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
      const [articles, radio, tv, press] = await Promise.all([
        supabase.from('news_articles')
          .select('id, title, source, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('transcriptions')
          .select('id, channel, program, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('tv_transcriptions')
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
        ...(tv.data || []).map(t => ({
          id: t.id,
          type: 'tv' as const,
          title: t.program || 'Transcripción de TV',
          source: t.channel || undefined,
          timestamp: t.created_at,
        })),
        ...(press.data || []).map(p => ({
          id: p.id,
          type: 'press' as const,
          title: p.title,
          source: p.publication_name,
          timestamp: p.created_at,
        })),
      ];

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
