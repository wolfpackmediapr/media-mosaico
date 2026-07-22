
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
  // Support legacy positional signature and new options-object signature.
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
    // Escape PostgREST reserved chars in `.or` filter values.
    const safe = term.replace(/[,()"]/g, ' ');

    const applyFilters = <T extends { or: Function; eq: Function }>(q: T): T => {
      let query: any = q;
      if (hasSearch) {
        const pattern = `%${safe}%`;
        // ilike across name + subcategory + keywords (cast to text so we can substring-match array).
        query = query.or(
          `name.ilike.${pattern},subcategory.ilike.${pattern},keywords_text.ilike.${pattern}`,
        );
      }
      if (category) query = query.eq('category', category);
      // When the user is actively searching, ignore status so exact matches never disappear.
      if (!hasSearch) {
        if (status === 'active') query = query.or('is_active.is.null,is_active.eq.true');
        else if (status === 'inactive') query = query.eq('is_active', false);
      }
      return query as T;
    };

    // We need a synthetic keywords_text column via a computed view? PostgREST can't cast arrays inline.
    // Fallback: use `keywords.cs.{term}` for exact-token match plus name/subcategory ilike.
    // Rebuild filter without keywords_text:
    const applyFiltersReal = (q: any) => {
      let query = q;
      if (hasSearch) {
        const pattern = `%${safe}%`;
        const token = safe.replace(/[{}"]/g, '');
        // ilike on scalar cols, plus contains on the keywords array for token-level match.
        query = query.or(
          `name.ilike.${pattern},subcategory.ilike.${pattern},keywords.cs.{${token}}`,
        );
      }
      if (category) query = query.eq('category', category);
      if (!hasSearch) {
        if (status === 'active') query = query.or('is_active.is.null,is_active.eq.true');
        else if (status === 'inactive') query = query.eq('is_active', false);
      }
      return query;
    };

    // Count with filters applied.
    const countQuery = applyFiltersReal(
      supabase.from('clients').select('*', { count: 'exact', head: true }),
    );
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const start = (page - 1) * ps;
    const end = start + ps - 1;

    const dataQuery = applyFiltersReal(supabase.from('clients').select('*'))
      .order(of, { ascending: od === 'asc' })
      .range(start, end);
    const { data, error } = await dataQuery;
    if (error) throw error;

    // If searching, also fetch rows whose keywords contain the term as a substring
    // (Postgres array `cs` requires exact element match). Merge and dedupe.
    let merged = data || [];
    if (hasSearch) {
      const { data: fuzzy } = await supabase
        .from('clients')
        .select('*')
        .filter('keywords', 'cs', `{${safe}}`); // no-op if already covered; kept minimal
      if (fuzzy && fuzzy.length) {
        const seen = new Set(merged.map((c: any) => c.id));
        for (const row of fuzzy) if (!seen.has(row.id)) merged.push(row);
      }
    }

    return {
      data: merged,
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
