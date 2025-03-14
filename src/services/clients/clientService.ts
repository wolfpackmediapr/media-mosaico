
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface Client {
  id?: string;
  name: string;
  category: string;
  subcategory?: string | null;
  keywords?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

export async function fetchClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    toast.error("Error al cargar los clientes");
    throw error;
  }
}

export async function addClient(client: Client) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        name: client.name,
        category: client.category,
        subcategory: client.subcategory || null,
        keywords: client.keywords || [],
      }])
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error: any) {
    console.error("Error adding client:", error);
    throw error;
  }
}

export async function updateClient(client: Client) {
  if (!client.id) {
    throw new Error("Client ID is required for update");
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        name: client.name,
        category: client.category,
        subcategory: client.subcategory || null,
        keywords: client.keywords || [],
      })
      .eq('id', client.id)
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error: any) {
    console.error("Error updating client:", error);
    throw error;
  }
}

export async function deleteClient(id: string) {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error deleting client:", error);
    throw error;
  }
}
