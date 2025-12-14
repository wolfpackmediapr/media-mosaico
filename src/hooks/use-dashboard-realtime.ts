import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to real-time updates for dashboard content tables.
 * Invalidates React Query cache when new content is added.
 */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a single channel for all dashboard content subscriptions
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news_articles'
        },
        () => {
          console.log('[Dashboard Realtime] New article detected');
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-content-activity'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-source-distribution'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-category-breakdown'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activity'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcriptions'
        },
        () => {
          console.log('[Dashboard Realtime] New radio transcription detected');
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-content-activity'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activity'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tv_transcriptions'
        },
        () => {
          console.log('[Dashboard Realtime] New TV transcription detected');
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-content-activity'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activity'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'press_clippings'
        },
        () => {
          console.log('[Dashboard Realtime] New press clipping detected');
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-content-activity'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activity'] });
        }
      )
      .subscribe((status) => {
        console.log('[Dashboard Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Dashboard Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
