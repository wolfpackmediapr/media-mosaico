
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect } from 'react';

type SubscriptionHandler = (payload: any) => void;

interface SubscriptionConfig {
  schema?: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

interface ActiveSubscription {
  channel: RealtimeChannel;
  configs: SubscriptionConfig[];
  refCount: number;
}

class SubscriptionManager {
  private activeSubscriptions: Record<string, ActiveSubscription> = {};
  private _debugMode = false;
  
  /**
   * Enable or disable debug logging
   */
  setDebugMode(enabled: boolean) {
    this._debugMode = enabled;
  }
  
  /**
   * Generate a unique key for subscription configs
   */
  private getSubscriptionKey(channelName: string): string {
    return `channel:${channelName}`;
  }
  
  /**
   * Create a subscription channel if it doesn't exist
   */
  private getOrCreateChannel(channelName: string): RealtimeChannel {
    const key = this.getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      this.log(`Creating new channel: ${channelName}`);
      
      const channel = supabase.channel(channelName);
      
      this.activeSubscriptions[key] = {
        channel,
        configs: [],
        refCount: 0
      };
    } else {
      this.log(`Using existing channel: ${channelName}`);
    }
    
    return this.activeSubscriptions[key].channel;
  }

  /**
   * Subscribe to database changes
   */
  subscribe(
    channelName: string,
    config: SubscriptionConfig,
    handler: SubscriptionHandler
  ): () => void {
    const key = this.getSubscriptionKey(channelName);
    const channel = this.getOrCreateChannel(channelName);
    const subscription = this.activeSubscriptions[key];
    
    // Add to reference count
    subscription.refCount++;
    
    // Store config for debugging
    subscription.configs.push(config);
    
    this.log(`Subscribing to ${config.table} (${config.event}) on channel ${channelName}`);
    this.log(`Channel ${channelName} now has ${subscription.refCount} subscribers`);
    
    // Add listener for this specific subscription
    channel.on(
      'postgres_changes',
      {
        event: config.event,
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter
      } as any, // Cast to any to bypass TypeScript strict checking
      handler
    );
    
    // If this is the first subscription for this channel, subscribe to it
    if (subscription.refCount === 1) {
      this.log(`Activating channel ${channelName}`);
      channel.subscribe((status) => {
        this.log(`Channel ${channelName} status: ${status}`);
      });
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(channelName, config);
    };
  }
  
  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelName: string, config: SubscriptionConfig): void {
    const key = this.getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      return;
    }
    
    const subscription = this.activeSubscriptions[key];
    subscription.refCount--;
    
    this.log(`Unsubscribing from ${config.table} (${config.event}) on channel ${channelName}`);
    this.log(`Channel ${channelName} now has ${subscription.refCount} subscribers`);
    
    // If no more references, remove the channel
    if (subscription.refCount <= 0) {
      this.log(`Removing channel ${channelName}`);
      supabase.removeChannel(subscription.channel);
      delete this.activeSubscriptions[key];
    }
  }
  
  /**
   * Forcefully close all channels
   */
  closeAll(): void {
    this.log('Forcefully closing all subscription channels');
    
    // Close all active channels
    Object.keys(this.activeSubscriptions).forEach(key => {
      const { channel } = this.activeSubscriptions[key];
      supabase.removeChannel(channel);
    });
    
    // Clear subscriptions
    this.activeSubscriptions = {};
  }
  
  /**
   * Get active subscription info for debugging
   */
  getActiveSubscriptions(): Record<string, { count: number, configs: SubscriptionConfig[] }> {
    const info: Record<string, { count: number, configs: SubscriptionConfig[] }> = {};
    
    Object.keys(this.activeSubscriptions).forEach(key => {
      const { refCount, configs } = this.activeSubscriptions[key];
      info[key] = { count: refCount, configs };
    });
    
    return info;
  }
  
  /**
   * Logger that respects debug mode
   */
  private log(...args: any[]): void {
    if (this._debugMode) {
      console.log('[SubscriptionManager]', ...args);
    }
  }
}

// Export a singleton instance
export const subscriptionManager = new SubscriptionManager();

// Usage example hook
export function useRealtimeSubscription(
  channelName: string,
  config: SubscriptionConfig,
  handler: SubscriptionHandler
) {
  useEffect(() => {
    const unsubscribe = subscriptionManager.subscribe(channelName, config, handler);
    return unsubscribe;
  }, [channelName, config.table, config.event, config.filter, handler]);
}
