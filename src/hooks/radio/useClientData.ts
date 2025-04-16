
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
        
        // Use the fetchClients function but get all clients with a large limit
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name')
          .limit(100);
        
        if (error) throw error;
        
        setClients(data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
        toast.error('No se pudieron cargar los clientes');
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
