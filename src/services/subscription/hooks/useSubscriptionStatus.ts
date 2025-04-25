
import { useState, useEffect } from 'react';
import { subscriptionManager } from '../subscriptionManager';

export function useSubscriptionStatus() {
  const [status, setStatus] = useState(subscriptionManager.getConnectionStatus());
  
  useEffect(() => {
    const unsubscribe = subscriptionManager.addConnectionListener(setStatus);
    return unsubscribe;
  }, []);
  
  return status;
}
