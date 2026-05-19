
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Client } from '@/services/clients/clientService';

export const useClientData = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        console.log('[useClientData] Loading clients from database...');
        
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name')
          .limit(100);
        
        if (error) {
          console.error('[useClientData] Error loading clients:', error);
          toast.error('No se pudieron cargar los clientes');
          setClients([]);
        } else {
          console.log(`[useClientData] Loaded ${data?.length || 0} clients`);
          setClients(data || []);
        }
      } catch (error) {
        console.error('[useClientData] Exception loading clients:', error);
        toast.error('Error al cargar los clientes');
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClients();
  }, []);

  return {
    clients,
    isLoading
  };
};
