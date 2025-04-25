
import { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ActiveSubscription } from "./types";
import { debugLog } from "./utils";

export class ChannelManager {
  private _debugMode = false;
  private _globalErrorListeners: Set<(error: any) => void> = new Set();

  setDebugMode(enabled: boolean) {
    this._debugMode = enabled;
  }

  addErrorListener(listener: (error: any) => void): () => void {
    this._globalErrorListeners.add(listener);
    return () => this._globalErrorListeners.delete(listener);
  }

  createChannel(channelName: string, options?: RealtimeChannelOptions): RealtimeChannel {
    debugLog(this._debugMode, `Creating new channel: ${channelName}`);
    const channel = supabase.channel(channelName, options);
    
    channel.on('system', { event: 'error' }, (error: any) => {
      debugLog(this._debugMode, `Channel error on ${channelName}:`, error);
      this._globalErrorListeners.forEach(listener => {
        try {
          listener(error);
        } catch (err) {
          console.error('Error in subscription error listener:', err);
        }
      });
    });

    return channel;
  }

  removeChannel(channel: RealtimeChannel) {
    supabase.removeChannel(channel);
  }
}

export const channelManager = new ChannelManager();
