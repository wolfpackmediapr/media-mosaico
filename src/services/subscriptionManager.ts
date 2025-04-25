
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";
import { useEffect, useState } from 'react';

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
  handlers: Map<string, SubscriptionHandler[]>;
}

class SubscriptionManager {
  private activeSubscriptions: Record<string, ActiveSubscription> = {};
  private _debugMode = false;
  private _connectionStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  private _connectionListeners: Set<(status: string) => void> = new Set();
  private _globalErrorListeners: Set<(error: any) => void> = new Set();
  
  constructor() {
    // Initialize health check for all subscriptions
    if (typeof window !== 'undefined') {
      this.setupConnectionMonitoring();
    }
  }
  
  /**
   * Set up periodic connection health check
   */
  private setupConnectionMonitoring(): void {
    setInterval(() => {
      const activeChannels = Object.values(this.activeSubscriptions);
      
      if (activeChannels.length > 0) {
        // Check the state of any channel as indicator of overall health
        const anyChannel = activeChannels[0].channel;
        const status = anyChannel?.state || 'DISCONNECTED';
        
        if (status !== this._connectionStatus) {
          this._connectionStatus = status as any;
          this.notifyConnectionListeners();
        }
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Notify all connection status listeners
   */
  private notifyConnectionListeners(): void {
    this._connectionListeners.forEach(listener => {
      try {
        listener(this._connectionStatus);
      } catch (error) {
        console.error('Error in subscription connection listener:', error);
      }
    });
  }
  
  /**
   * Add a connection status listener
   */
  addConnectionListener(listener: (status: string) => void): () => void {
    this._connectionListeners.add(listener);
    return () => this._connectionListeners.delete(listener);
  }
  
  /**
   * Add a global error listener for all subscriptions
   */
  addErrorListener(listener: (error: any) => void): () => void {
    this._globalErrorListeners.add(listener);
    return () => this._globalErrorListeners.delete(listener);
  }
  
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
   * Generate a unique handler key for a config
   */
  private getHandlerKey(config: SubscriptionConfig): string {
    return `${config.schema || 'public'}.${config.table}.${config.event}.${config.filter || ''}`;
  }
  
  /**
   * Create a subscription channel if it doesn't exist
   */
  private getOrCreateChannel(channelName: string, options?: RealtimeChannelOptions): RealtimeChannel {
    const key = this.getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      this.log(`Creating new channel: ${channelName}`);
      
      const channel = supabase.channel(channelName, options);
      
      this.activeSubscriptions[key] = {
        channel,
        configs: [],
        refCount: 0,
        handlers: new Map()
      };
      
      // Add error handling for the channel
      // Fix: The channel.on method expects 3 arguments when listening for events
      // The third argument is the callback function
      channel.on('error', (error: any) => {
        this.log(`Channel error on ${channelName}:`, error);
        this._globalErrorListeners.forEach(listener => {
          try {
            listener(error);
          } catch (err) {
            console.error('Error in subscription error listener:', err);
          }
        });
      }, () => {}); // Empty callback as the third argument
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
    handler: SubscriptionHandler,
    channelOptions?: RealtimeChannelOptions
  ): () => void {
    const key = this.getSubscriptionKey(channelName);
    const channel = this.getOrCreateChannel(channelName, channelOptions);
    const subscription = this.activeSubscriptions[key];
    const handlerKey = this.getHandlerKey(config);
    
    // Add to reference count
    subscription.refCount++;
    
    // Store config for debugging
    subscription.configs.push(config);
    
    // Store handler
    if (!subscription.handlers.has(handlerKey)) {
      subscription.handlers.set(handlerKey, []);
    }
    subscription.handlers.get(handlerKey)?.push(handler);
    
    this.log(`Subscribing to ${config.table} (${config.event}) on channel ${channelName}`);
    this.log(`Channel ${channelName} now has ${subscription.refCount} subscribers`);
    
    // Add listener for this specific subscription
    // Fix: Use the correct syntax for postgres_changes by replacing the generic 'on' call
    // with the specific 'postgres_changes' event type
    channel.on(
      'postgres_changes', 
      {
        event: config.event,
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter
      },
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
      this.unsubscribe(channelName, config, handler);
    };
  }
  
  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(
    channelName: string, 
    config: SubscriptionConfig, 
    handler: SubscriptionHandler
  ): void {
    const key = this.getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      return;
    }
    
    const subscription = this.activeSubscriptions[key];
    const handlerKey = this.getHandlerKey(config);
    
    // Remove the specific handler
    if (subscription.handlers.has(handlerKey)) {
      const handlers = subscription.handlers.get(handlerKey) || [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      
      if (handlers.length === 0) {
        subscription.handlers.delete(handlerKey);
      }
    }
    
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
   * Get the current connection status
   */
  getConnectionStatus(): string {
    return this._connectionStatus;
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
  handler: SubscriptionHandler,
  options?: RealtimeChannelOptions
) {
  useEffect(() => {
    const unsubscribe = subscriptionManager.subscribe(channelName, config, handler, options);
    return unsubscribe;
  }, [channelName, config.table, config.event, config.filter, handler]);
}

// Hook for monitoring connection status
export function useSubscriptionStatus() {
  const [status, setStatus] = useState(subscriptionManager.getConnectionStatus());
  
  useEffect(() => {
    const unsubscribe = subscriptionManager.addConnectionListener(setStatus);
    return unsubscribe;
  }, []);
  
  return status;
}
