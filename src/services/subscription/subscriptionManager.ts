
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";
import { 
  ActiveSubscription, 
  SubscriptionConfig, 
  SubscriptionHandler, 
  ConnectionStatus 
} from "./types";
import { getSubscriptionKey, getHandlerKey, debugLog } from "./utils";

class SubscriptionManager {
  private activeSubscriptions: Record<string, ActiveSubscription> = {};
  private _debugMode = false;
  private _connectionStatus: ConnectionStatus = 'DISCONNECTED';
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
          this._connectionStatus = status as ConnectionStatus;
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
  
  private getOrCreateChannel(channelName: string, options?: RealtimeChannelOptions): RealtimeChannel {
    const key = getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      debugLog(this._debugMode, `Creating new channel: ${channelName}`);
      
      const channel = supabase.channel(channelName, options);
      
      this.activeSubscriptions[key] = {
        channel,
        configs: [],
        refCount: 0,
        handlers: new Map()
      };
      
      channel
        .on('system', { event: 'error' }, (error: any) => {
          debugLog(this._debugMode, `Channel error on ${channelName}:`, error);
          this._globalErrorListeners.forEach(listener => {
            try {
              listener(error);
            } catch (err) {
              console.error('Error in subscription error listener:', err);
            }
          });
        });
    } else {
      debugLog(this._debugMode, `Using existing channel: ${channelName}`);
    }
    
    return this.activeSubscriptions[key].channel;
  }
  
  subscribe(
    channelName: string,
    config: SubscriptionConfig,
    handler: SubscriptionHandler,
    channelOptions?: RealtimeChannelOptions
  ): () => void {
    const key = getSubscriptionKey(channelName);
    const channel = this.getOrCreateChannel(channelName, channelOptions);
    const subscription = this.activeSubscriptions[key];
    const handlerKey = getHandlerKey(config);
    
    subscription.refCount++;
    subscription.configs.push(config);
    
    if (!subscription.handlers.has(handlerKey)) {
      subscription.handlers.set(handlerKey, []);
    }
    subscription.handlers.get(handlerKey)?.push(handler);
    
    debugLog(this._debugMode, `Subscribing to ${config.table} (${config.event}) on channel ${channelName}`);
    debugLog(this._debugMode, `Channel ${channelName} now has ${subscription.refCount} subscribers`);
    
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
    
    if (subscription.refCount === 1) {
      debugLog(this._debugMode, `Activating channel ${channelName}`);
      channel.subscribe();
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
    const key = getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      return;
    }
    
    const subscription = this.activeSubscriptions[key];
    const handlerKey = getHandlerKey(config);
    
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
    
    debugLog(this._debugMode, `Unsubscribing from ${config.table} (${config.event}) on channel ${channelName}`);
    debugLog(this._debugMode, `Channel ${channelName} now has ${subscription.refCount} subscribers`);
    
    if (subscription.refCount <= 0) {
      debugLog(this._debugMode, `Removing channel ${channelName}`);
      supabase.removeChannel(subscription.channel);
      delete this.activeSubscriptions[key];
    }
  }
  
  closeAll(): void {
    debugLog(this._debugMode, 'Forcefully closing all subscription channels');
    
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
}

export const subscriptionManager = new SubscriptionManager();
