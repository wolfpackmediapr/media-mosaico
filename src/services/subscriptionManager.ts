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
    if (typeof window !== 'undefined') {
      this.setupConnectionMonitoring();
    }
  }
  
  private setupConnectionMonitoring(): void {
    setInterval(() => {
      const activeChannels = Object.values(this.activeSubscriptions);
      
      if (activeChannels.length > 0) {
        const anyChannel = activeChannels[0].channel;
        const status = anyChannel?.state || 'DISCONNECTED';
        
        if (status !== this._connectionStatus) {
          this._connectionStatus = status as any;
          this.notifyConnectionListeners();
        }
      }
    }, 10000);
  }
  
  private notifyConnectionListeners(): void {
    this._connectionListeners.forEach(listener => {
      try {
        listener(this._connectionStatus);
      } catch (error) {
        console.error('Error in subscription connection listener:', error);
      }
    });
  }
  
  addConnectionListener(listener: (status: string) => void): () => void {
    this._connectionListeners.add(listener);
    return () => this._connectionListeners.delete(listener);
  }
  
  addErrorListener(listener: (error: any) => void): () => void {
    this._globalErrorListeners.add(listener);
    return () => this._globalErrorListeners.delete(listener);
  }
  
  setDebugMode(enabled: boolean) {
    this._debugMode = enabled;
  }
  
  private getSubscriptionKey(channelName: string): string {
    return `channel:${channelName}`;
  }
  
  private getHandlerKey(config: SubscriptionConfig): string {
    return `${config.schema || 'public'}.${config.table}.${config.event}.${config.filter || ''}`;
  }
  
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
      
      channel.on('system', { event: 'error' }, (error: any) => {
        this.log(`Channel error on ${channelName}:`, error);
        this._globalErrorListeners.forEach(listener => {
          try {
            listener(error);
          } catch (err) {
            console.error('Error in subscription error listener:', err);
          }
        });
      });
    } else {
      this.log(`Using existing channel: ${channelName}`);
    }
    
    return this.activeSubscriptions[key].channel;
  }
  
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
    
    subscription.refCount++;
    
    subscription.configs.push(config);
    
    if (!subscription.handlers.has(handlerKey)) {
      subscription.handlers.set(handlerKey, []);
    }
    subscription.handlers.get(handlerKey)?.push(handler);
    
    this.log(`Subscribing to ${config.table} (${config.event}) on channel ${channelName}`);
    this.log(`Channel ${channelName} now has ${subscription.refCount} subscribers`);
    
    channel.on('postgres_changes', 
      { 
        event: config.event, 
        schema: config.schema || 'public', 
        table: config.table, 
        filter: config.filter 
      }, 
      handler
    );
    
    if (subscription.refCount === 1) {
      this.log(`Activating channel ${channelName}`);
      channel.subscribe((status) => {
        this.log(`Channel ${channelName} status: ${status}`);
      });
    }
    
    return () => {
      this.unsubscribe(channelName, config, handler);
    };
  }
  
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
    
    if (subscription.refCount <= 0) {
      this.log(`Removing channel ${channelName}`);
      supabase.removeChannel(subscription.channel);
      delete this.activeSubscriptions[key];
    }
  }
  
  closeAll(): void {
    this.log('Forcefully closing all subscription channels');
    
    Object.keys(this.activeSubscriptions).forEach(key => {
      const { channel } = this.activeSubscriptions[key];
      supabase.removeChannel(channel);
    });
    
    this.activeSubscriptions = {};
  }
  
  getActiveSubscriptions(): Record<string, { count: number, configs: SubscriptionConfig[] }> {
    const info: Record<string, { count: number, configs: SubscriptionConfig[] }> = {};
    
    Object.keys(this.activeSubscriptions).forEach(key => {
      const { refCount, configs } = this.activeSubscriptions[key];
      info[key] = { count: refCount, configs };
    });
    
    return info;
  }
  
  getConnectionStatus(): string {
    return this._connectionStatus;
  }
  
  private log(...args: any[]): void {
    if (this._debugMode) {
      console.log('[SubscriptionManager]', ...args);
    }
  }
}

export const subscriptionManager = new SubscriptionManager();

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

export function useSubscriptionStatus() {
  const [status, setStatus] = useState(subscriptionManager.getConnectionStatus());
  
  useEffect(() => {
    const unsubscribe = subscriptionManager.addConnectionListener(setStatus);
    return unsubscribe;
  }, []);
  
  return status;
}
