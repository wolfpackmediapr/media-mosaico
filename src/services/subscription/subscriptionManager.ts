
import { RealtimeChannelOptions } from "@supabase/supabase-js";
import { 
  ActiveSubscription, 
  SubscriptionConfig, 
  SubscriptionHandler 
} from "./types";
import { getSubscriptionKey, getHandlerKey, debugLog } from "./utils";
import { channelManager } from "./channelManager";
import { connectionMonitor } from "./connectionMonitor";

class SubscriptionManager {
  private activeSubscriptions: Record<string, ActiveSubscription> = {};
  private _debugMode = false;
  
  constructor() {
    this.setupConnectionMonitoring();
  }
  
  private setupConnectionMonitoring(): void {
    const updateStatus = () => {
      const activeChannels = Object.values(this.activeSubscriptions);
      if (activeChannels.length > 0) {
        const anyChannel = activeChannels[0].channel;
        const status = anyChannel?.state || 'DISCONNECTED';
        connectionMonitor.setStatus(status as ConnectionStatus);
      }
    };
    setInterval(updateStatus, 10000);
  }
  
  addConnectionListener(listener: (status: string) => void): () => void {
    return connectionMonitor.addListener(listener);
  }
  
  addErrorListener(listener: (error: any) => void): () => void {
    return channelManager.addErrorListener(listener);
  }
  
  setDebugMode(enabled: boolean) {
    this._debugMode = enabled;
    channelManager.setDebugMode(enabled);
  }
  
  private getOrCreateChannel(channelName: string, options?: RealtimeChannelOptions) {
    const key = getSubscriptionKey(channelName);
    
    if (!this.activeSubscriptions[key]) {
      const channel = channelManager.createChannel(channelName, options);
      this.activeSubscriptions[key] = {
        channel,
        configs: [],
        refCount: 0,
        handlers: new Map()
      };
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
    
    const changes = channel.on(
      'postgres_changes' as const,
      {
        event: config.event,
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter
      },
      (payload) => handler(payload)
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
      channelManager.removeChannel(subscription.channel);
      delete this.activeSubscriptions[key];
    }
  }
  
  closeAll(): void {
    debugLog(this._debugMode, 'Forcefully closing all subscription channels');
    
    Object.keys(this.activeSubscriptions).forEach(key => {
      const { channel } = this.activeSubscriptions[key];
      channelManager.removeChannel(channel);
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
    return connectionMonitor.getCurrentStatus();
  }
}

export const subscriptionManager = new SubscriptionManager();
