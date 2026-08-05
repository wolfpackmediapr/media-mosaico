import { supabase } from "@/integrations/supabase/client";

export interface ClientSubcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ClientCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  subcategories?: ClientSubcategory[];
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Full taxonomy (categories with their nested subcategories). */
export async function fetchClientCategories(): Promise<ClientCategory[]> {
  const [{ data: cats, error: catError }, { data: subs, error: subError }] = await Promise.all([
    supabase.from("client_categories").select("*").order("sort_order").order("name"),
    supabase.from("client_subcategories").select("*").order("sort_order").order("name"),
  ]);

  if (catError) throw catError;
  if (subError) throw subError;

  const byCategory = new Map<string, ClientSubcategory[]>();
  (subs || []).forEach((s: any) => {
    const list = byCategory.get(s.category_id) || [];
    list.push(s as ClientSubcategory);
    byCategory.set(s.category_id, list);
  });

  return (cats || []).map((c: any) => ({
    ...(c as ClientCategory),
    subcategories: byCategory.get(c.id) || [],
  }));
}

/** How many clients use each category / subcategory. */
export async function fetchClientCategoryUsage(): Promise<{
  byCategory: Record<string, number>;
  bySubcategory: Record<string, number>;
}> {
  const [{ data, error }, { data: assignments, error: assignError }] = await Promise.all([
    supabase.from("clients").select("client_category_id"),
    supabase.from("client_subcategory_assignments").select("client_id, client_subcategory_id"),
  ]);
  if (error) throw error;
  if (assignError) throw assignError;

  const byCategory: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    if (row.client_category_id) {
      byCategory[row.client_category_id] = (byCategory[row.client_category_id] || 0) + 1;
    }
  });
  // Subcategory usage now comes from the junction table (multi-subcategory).
  const seen = new Set<string>();
  (assignments || []).forEach((row: any) => {
    const key = `${row.client_id}:${row.client_subcategory_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    bySubcategory[row.client_subcategory_id] = (bySubcategory[row.client_subcategory_id] || 0) + 1;
  });
  return { byCategory, bySubcategory };
}

export async function createClientCategory(input: {
  name: string;
  description?: string | null;
  sort_order?: number;
}) {
  const { data, error } = await supabase
    .from("client_categories")
    .insert([
      {
        name: input.name.trim(),
        slug: slugify(input.name),
        description: input.description || null,
        sort_order: input.sort_order ?? 0,
      },
    ])
    .select()
    .single();
  if (error) {
    if ((error as any).code === "23505") throw new Error("Ya existe una categoría con ese nombre.");
    throw error;
  }
  return data;
}

export async function updateClientCategory(
  id: string,
  input: { name?: string; description?: string | null; is_active?: boolean; sort_order?: number },
) {
  const payload: any = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.is_active !== undefined) payload.is_active = input.is_active;
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("client_categories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createClientSubcategory(input: {
  category_id: string;
  categorySlug: string;
  name: string;
  description?: string | null;
  sort_order?: number;
}) {
  const { data, error } = await supabase
    .from("client_subcategories")
    .insert([
      {
        category_id: input.category_id,
        name: input.name.trim(),
        slug: `${input.categorySlug}--${slugify(input.name)}`,
        description: input.description || null,
        sort_order: input.sort_order ?? 0,
      },
    ])
    .select()
    .single();
  if (error) {
    if ((error as any).code === "23505") throw new Error("Ya existe una subcategoría con ese nombre en esta categoría.");
    throw error;
  }
  return data;
}

export async function updateClientSubcategory(
  id: string,
  input: { name?: string; description?: string | null; is_active?: boolean; sort_order?: number },
) {
  const payload: any = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.is_active !== undefined) payload.is_active = input.is_active;
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("client_subcategories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Deletion is only allowed when nothing references the record. */
export async function deleteClientCategory(id: string, usageCount: number) {
  if (usageCount > 0) {
    throw new Error(
      `No se puede eliminar: ${usageCount} cliente(s) usan esta categoría. Desactívala en su lugar.`,
    );
  }
  const { error } = await supabase.from("client_categories").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function deleteClientSubcategory(id: string, usageCount: number) {
  if (usageCount > 0) {
    throw new Error(
      `No se puede eliminar: ${usageCount} cliente(s) usan esta subcategoría. Desactívala en su lugar.`,
    );
  }
  const { error } = await supabase.from("client_subcategories").delete().eq("id", id);
  if (error) throw error;
  return true;
}