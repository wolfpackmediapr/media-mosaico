/**
 * Reads internal Publiteca `public.clients` (read-only) and maps rows to the
 * Portal `/api/public/ingest/clients` item DTO, exactly as the Portal's strict
 * schema defines it. No internal object is written or altered.
 */

export interface ClientItemDTO {
  client_id: string;
  name: string;
  is_active?: boolean;
  source_updated_at: string;
  source_state?: "active" | "inactive" | "deleted";
}

interface InternalClientRow {
  id: string;
  name: string;
  is_active: boolean | null;
  updated_at: string;
}

const PAGE_SIZE = 500;

function toIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("clients.updated_at is not a valid timestamp");
  }
  return parsed.toISOString();
}

/**
 * Hard-delete detection (emitting source_state="deleted") is deliberately
 * deferred beyond CP3 Step 1: internal `clients` has no tombstone column.
 */
export function mapClientRow(row: InternalClientRow): ClientItemDTO {
  if (!row.id) throw new Error("clients.id is required");
  if (!row.name || row.name.length > 500) {
    throw new Error(`clients.name missing or longer than 500 chars for ${row.id}`);
  }
  const isActive = row.is_active !== false;
  return {
    client_id: row.id,
    name: row.name,
    is_active: isActive,
    source_updated_at: toIso(row.updated_at),
    source_state: isActive ? "active" : "inactive",
  };
}

/**
 * Fetches all clients via internal PostgREST using the internal runtime
 * credentials only. The Portal never receives, and never needs, these values.
 */
export async function fetchInternalClients(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  limit?: number;
}): Promise<ClientItemDTO[]> {
  const out: ClientItemDTO[] = [];
  let offset = 0;

  for (;;) {
    const pageSize = Math.min(PAGE_SIZE, params.limit ? params.limit - out.length : PAGE_SIZE);
    if (pageSize <= 0) break;

    const url = new URL("/rest/v1/clients", params.supabaseUrl);
    url.searchParams.set("select", "id,name,is_active,updated_at");
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), {
      headers: {
        apikey: params.serviceRoleKey,
        authorization: `Bearer ${params.serviceRoleKey}`,
        accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Internal clients read failed with status ${response.status}`);
    }

    const rows = (await response.json()) as InternalClientRow[];
    for (const row of rows) out.push(mapClientRow(row));
    if (rows.length < pageSize) break;
    offset += rows.length;
  }

  return out;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
