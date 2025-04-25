
import { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";

export type SubscriptionHandler = (payload: any) => void;

export interface SubscriptionConfig {
  schema?: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export interface ActiveSubscription {
  channel: RealtimeChannel;
  configs: SubscriptionConfig[];
  refCount: number;
  handlers: Map<string, SubscriptionHandler[]>;
}

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
