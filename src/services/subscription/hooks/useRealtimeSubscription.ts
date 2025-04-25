
import { useEffect } from 'react';
import { RealtimeChannelOptions } from "@supabase/supabase-js";
import { subscriptionManager } from '../subscriptionManager';
import { SubscriptionConfig, SubscriptionHandler } from '../types';

export function useRealtimeSubscription(
  channelName: string,
  config: SubscriptionConfig,
  handler: SubscriptionHandler,
  options?: RealtimeChannelOptions
) {
  useEffect(() => {
    const unsubscribe = subscriptionManager.subscribe(channelName, config, handler, options);
    return unsubscribe;
  }, [channelName, config.table, config.event, config.filter, handler]);
}
