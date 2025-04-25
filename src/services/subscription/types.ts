
import { RealtimeChannel, RealtimeChannelOptions, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

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
