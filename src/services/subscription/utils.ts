
import { SubscriptionConfig } from "./types";

export const getSubscriptionKey = (channelName: string): string => {
  return `channel:${channelName}`;
};

export const getHandlerKey = (config: SubscriptionConfig): string => {
  return `${config.schema || 'public'}.${config.table}.${config.event}.${config.filter || ''}`;
};

export const debugLog = (enabled: boolean, ...args: any[]): void => {
  if (enabled) {
    console.log('[SubscriptionManager]', ...args);
  }
};
