
import { RealtimeChannel, RealtimeChannelOptions, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Updated ConnectionStatus type to match possible Supabase channel states
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'CHANNEL_ERROR' | 
                              'CLOSED' | 'TIMED_OUT' | 'SUBSCRIBED' | 'PENDING' | 'UNSUBSCRIBED' | 
                              'REJECTED' | string;

export interface SubscriptionConfig {
  schema?: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export type SubscriptionHandler = (payload: RealtimePostgresChangesPayload<any>) => void;

export interface ActiveSubscription {
  channel: RealtimeChannel;
  configs: SubscriptionConfig[];
  refCount: number;
  handlers: Map<string, SubscriptionHandler[]>;
}
