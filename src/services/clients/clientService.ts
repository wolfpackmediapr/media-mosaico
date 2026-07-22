
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface Client {
  id?: string;
  name: string;
  category: string;
  subcategory?: string | null;
  keywords?: string[] | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedClients {
  data: Client[];
  totalCount: number;
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

export interface FetchClientsOptions {
  page?: number;
  pageSize?: number;
  orderField?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  category?: string | null;
  status?: 'active' | 'inactive' | 'all';
}

export async function fetchClients(
  pageOrOptions: number | FetchClientsOptions = 1,
  pageSize = 10,
  orderField = 'name',
  orderDirection: 'asc' | 'desc' = 'asc',
) {
  const opts: FetchClientsOptions =
    typeof pageOrOptions === 'object'
      ? pageOrOptions
      : { page: pageOrOptions, pageSize, orderField, orderDirection };

  const {
    page = 1,
    pageSize: ps = 10,
    orderField: of = 'name',
    orderDirection: od = 'asc',
    search,
    category,
    status = 'all',
  } = opts;

  try {
    const term = (search ?? '').trim();
    const hasSearch = term.length > 0;
    // Escape PostgREST `.or` reserved chars.
    const safe = term.replace(/[,()"{}]/g, ' ').trim();

    const applyFilters = (q: any) => {
      let query = q;
      if (hasSearch && safe.length > 0) {
        const pattern = `*${safe}*`;
        // ilike on scalar cols + array-contains on keywords (exact token match).
        query = query.or(
          `name.ilike.${pattern},subcategory.ilike.${pattern},keywords.cs.{${safe}}`,
        );
      }
      if (category) query = query.eq('category', category);
      // When searching, ignore status so exact matches always surface.
      if (!hasSearch) {
        if (status === 'active') query = query.or('is_active.is.null,is_active.eq.true');
        else if (status === 'inactive') query = query.eq('is_active', false);
      }
      return query;
    };

    const { count, error: countError } = await applyFilters(
      supabase.from('clients').select('*', { count: 'exact', head: true }),
    );
    if (countError) throw countError;

    const start = (page - 1) * ps;
    const end = start + ps - 1;

    const { data, error } = await applyFilters(supabase.from('clients').select('*'))
      .order(of, { ascending: od === 'asc' })
      .range(start, end);
    if (error) throw error;

    return {
      data: (data || []) as Client[],
      totalCount: count || 0,
    };
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    toast.error('Error al cargar los clientes');
    throw error;
  }
}

export async function addClient(client: Client) {
  try {
    const normalized = client.name.trim();
    // Pre-check for case-insensitive duplicate (active or inactive).
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name, is_active')
      .ilike('name', normalized)
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error(
        `Ya existe un cliente con ese nombre ("${existing[0].name}"${existing[0].is_active === false ? ", inactivo" : ""}). Edítalo en vez de crear uno nuevo.`
      );
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        name: normalized,
        category: client.category,
        subcategory: client.subcategory || null,
        keywords: client.keywords || [],
      }])
      .select();

    if (error) {
      if ((error as any).code === '23505') {
        throw new Error('Ya existe un cliente con ese nombre (activo o inactivo). Edítalo en vez de crear uno nuevo.');
      }
      throw error;
    }
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
    const normalized = client.name.trim();
    // Block rename that would collide with another existing client (case-insensitive).
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name, is_active')
      .ilike('name', normalized)
      .neq('id', client.id)
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error(
        `Ya existe otro cliente con ese nombre ("${existing[0].name}"${existing[0].is_active === false ? ", inactivo" : ""}).`
      );
    }

    const { data, error } = await supabase
      .from('clients')
      .update({
        name: normalized,
        category: client.category,
        subcategory: client.subcategory || null,
        keywords: client.keywords || [],
      })
      .eq('id', client.id)
      .select();

    if (error) {
      if ((error as any).code === '23505') {
        throw new Error('Ya existe otro cliente con ese nombre (activo o inactivo).');
      }
      throw error;
    }
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

export async function setClientActive(id: string, isActive: boolean) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({ is_active: isActive } as any)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error: any) {
    console.error("Error updating client active state:", error);
    throw error;
  }
}
