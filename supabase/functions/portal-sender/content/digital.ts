/**
 * Digital content mapping for the internal Publiteca `portal-sender`.
 *
 * Read-only against internal `public.news_articles` (restricted to feed sources
 * whose `platform = 'news'`) and `public.clients`. Nothing internal is written.
 *
 * Version safety (CP5-C2B closeout): `news_articles.updated_at` is maintained by
 * the `update_news_articles_updated_at` BEFORE UPDATE trigger for every row
 * mutation, so it is the content version. `pub_date` is the publication time.
 * `created_at`, `last_processed`, export time and `now()` are never used.
 */

import {
  type ContentItemDTO,
  DIGITAL_SENTIMENT_SOURCE,
  type MentionDTO,
  normalizeSentiment,
  type SourceIdReportEntry,
} from "./types.ts";

const PAGE_SIZE = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/** Deterministic exact matching only: trim + lowercase. No fuzzy matching. */
export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export interface ClientLookup {
  /** Canonical ids that exist in `public.clients`. */
  ids: Set<string>;
  /** normalized current name -> canonical id */
  byName: Map<string, string>;
  /** normalized exact alias -> canonical id */
  byAlias: Map<string, string>;
}

interface InternalClientRow {
  id: string;
  name: string;
  aliases: string[] | null;
}

export function buildClientLookup(rows: InternalClientRow[]): ClientLookup {
  const ids = new Set<string>();
  const byName = new Map<string, string>();
  const byAlias = new Map<string, string>();
  for (const row of rows) {
    if (!isUuid(row.id)) continue;
    ids.add(row.id);
    if (typeof row.name === "string" && row.name.trim()) {
      byName.set(normalizeName(row.name), row.id);
    }
    for (const alias of row.aliases ?? []) {
      if (typeof alias === "string" && alias.trim()) {
        byAlias.set(normalizeName(alias), row.id);
      }
    }
  }
  return { ids, byName, byAlias };
}

export interface DigitalRow {
  id: string;
  title: string | null;
  summary: string | null;
  description: string | null;
  category: string | null;
  source: string | null;
  link: string | null;
  image_url: string | null;
  pub_date: string | null;
  updated_at: string | null;
  sentiment: string | null;
  sentiment_score: number | string | null;
  keywords: string[] | null;
  clients: unknown;
  feed_source_id: string | null;
  feed_sources?: { name?: string | null; platform?: string | null } | null;
}

function toIso(value: string, field: string, id: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`news_articles.${field} is not a valid timestamp for ${id}`);
  }
  return parsed.toISOString();
}

function absoluteUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** All source shapes the internal news transformation layer already handles. */
export function extractClientIdentities(
  raw: unknown,
): Array<{ id?: unknown; name?: string }> {
  const out: Array<{ id?: unknown; name?: string }> = [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      const name = text(value);
      return name ? [{ name }] : [];
    }
  }
  if (!Array.isArray(value)) {
    if (value && typeof value === "object") value = [value];
    else return out;
  }
  for (const entry of value as unknown[]) {
    if (typeof entry === "string") {
      const name = text(entry);
      if (name) out.push({ name });
      continue;
    }
    if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const name =
        text(obj.name) ?? text(obj.client_name) ?? text(obj.nombre) ?? undefined;
      const id = obj.id ?? obj.client_id;
      if (name !== undefined || id !== undefined) out.push({ id, name });
    }
  }
  return out;
}

export interface MentionResolution {
  mentions: MentionDTO[];
  total_identities: number;
  resolved_canonical: number;
  unresolved_names: number;
}

/**
 * Authoritative complete snapshot of the item's client identities.
 *
 * A stored id is used only when it is UUID-shaped AND exists in
 * `public.clients`; otherwise it is fully ignored (placeholder ids such as
 * `metropistas_uuid` can never reach the Portal). Names resolve by exact
 * normalized current name, then exact internal alias. Nothing else resolves,
 * and no UUID is ever fabricated.
 */
export function resolveMentions(rawClients: unknown, lookup: ClientLookup): MentionResolution {
  const identities = extractClientIdentities(rawClients);
  const byId = new Map<string, MentionDTO>();
  const byName = new Map<string, MentionDTO>();

  for (const identity of identities) {
    const rawName = identity.name;
    let canonical: string | undefined;

    const storedId = typeof identity.id === "string" ? identity.id.trim() : "";
    if (isUuid(storedId) && lookup.ids.has(storedId)) {
      canonical = storedId;
    } else if (rawName) {
      const key = normalizeName(rawName);
      canonical = lookup.byName.get(key) ?? lookup.byAlias.get(key);
    }

    if (canonical) {
      const existing = byId.get(canonical);
      if (existing) {
        if (!existing.raw_client_name && rawName) existing.raw_client_name = rawName;
        continue;
      }
      byId.set(canonical, {
        raw_client_id: canonical,
        ...(rawName ? { raw_client_name: rawName } : {}),
      });
      continue;
    }

    if (!rawName) continue;
    const key = normalizeName(rawName);
    if (!byName.has(key)) byName.set(key, { raw_client_name: rawName });
  }

  return {
    mentions: [...byId.values(), ...byName.values()],
    total_identities: identities.length,
    resolved_canonical: byId.size,
    unresolved_names: byName.size,
  };
}

/**
 * Maps one Digital row. Throws a deterministic mapping error before any
 * transport when a required field is missing — no partial DTO, no fabrication.
 */
export function mapDigitalRow(row: DigitalRow, lookup: ClientLookup): ContentItemDTO {
  if (!isUuid(row.id)) throw new Error("news_articles.id is missing or not a UUID");
  const title = text(row.title);
  if (!title) throw new Error(`news_articles.title is required for ${row.id}`);
  if (!row.updated_at) throw new Error(`news_articles.updated_at is required for ${row.id}`);
  if (!row.pub_date) throw new Error(`news_articles.pub_date is required for ${row.id}`);

  const imageUrl = absoluteUrl(row.image_url);
  const articleUrl = absoluteUrl(row.link);

  const metadata: Record<string, unknown> = {};
  if (row.feed_source_id) metadata.feed_source_id = row.feed_source_id;
  metadata.internal_platform = "news";
  if (Array.isArray(row.keywords) && row.keywords.length > 0) {
    metadata.internal_keywords = row.keywords.slice(0, 50);
  }

  const sentiment = normalizeSentiment(row.sentiment);
  if (!sentiment && text(row.sentiment)) {
    metadata.internal_sentiment_raw = String(row.sentiment);
  }

  let score: number | undefined;
  const rawScore = row.sentiment_score;
  if (rawScore !== null && rawScore !== undefined && rawScore !== "") {
    const parsed = typeof rawScore === "number" ? rawScore : Number(rawScore);
    if (Number.isFinite(parsed) && parsed >= -1 && parsed <= 1) {
      score = parsed;
    } else {
      // Never clamped into range: omitted with an operational diagnostic.
      metadata.internal_sentiment_score_omitted = String(rawScore);
    }
  }

  const { mentions } = resolveMentions(row.clients, lookup);

  return {
    source_type: "digital",
    source_id: row.id,
    source_updated_at: toIso(row.updated_at, "updated_at", row.id),
    source_state: "active",
    effective_at: toIso(row.pub_date, "pub_date", row.id),
    effective_at_estimated: false,

    title,
    ...(text(row.summary) ? { summary: text(row.summary)! } : {}),
    ...(text(row.description) ? { body_text: text(row.description)! } : {}),
    ...(text(row.category) ? { category: text(row.category)! } : {}),
    ...(text(row.source) ?? text(row.feed_sources?.name)
      ? { media_outlet: (text(row.source) ?? text(row.feed_sources?.name))! }
      : {}),
    ...(articleUrl ? { article_url: articleUrl } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    has_media: !!imageUrl,

    ...(sentiment ? { sentiment, sentiment_source: DIGITAL_SENTIMENT_SOURCE } : {}),
    ...(score !== undefined ? { sentiment_score: score } : {}),

    mentions,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

const SELECT =
  "id,title,summary,description,category,source,link,image_url,pub_date,updated_at,sentiment,sentiment_score,keywords,clients,feed_source_id,feed_sources!inner(name,platform)";

async function restGet(
  url: URL,
  serviceRoleKey: string,
): Promise<unknown[]> {
  const response = await fetch(url.toString(), {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Internal digital read failed with status ${response.status}`);
  }
  return (await response.json()) as unknown[];
}

export async function fetchClientLookup(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
}): Promise<ClientLookup> {
  const rows: InternalClientRow[] = [];
  let offset = 0;
  for (;;) {
    const url = new URL("/rest/v1/clients", params.supabaseUrl);
    url.searchParams.set("select", "id,name,aliases");
    url.searchParams.set("order", "id.asc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    const page = (await restGet(url, params.serviceRoleKey)) as InternalClientRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += page.length;
  }
  return buildClientLookup(rows);
}

export interface DigitalFetchResult {
  items: ContentItemDTO[];
  source_id_report?: SourceIdReportEntry[];
}

/**
 * Reads Digital rows through the locked selector:
 *   news_articles INNER JOIN feed_sources ON id = feed_source_id
 *   WHERE feed_sources.platform = 'news'
 * Twitter / Instagram / NULL-feed-source rows are structurally unreachable.
 * `sourceIds` is a UUID-only selector; no caller SQL or filter fragment.
 */
export async function fetchDigitalContent(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  limit?: number;
  sourceIds?: string[];
  lookup?: ClientLookup;
}): Promise<DigitalFetchResult> {
  const lookup = params.lookup ??
    (await fetchClientLookup({
      supabaseUrl: params.supabaseUrl,
      serviceRoleKey: params.serviceRoleKey,
    }));

  const baseUrl = (extra: (url: URL) => void) => {
    const url = new URL("/rest/v1/news_articles", params.supabaseUrl);
    url.searchParams.set("select", SELECT);
    url.searchParams.set("feed_sources.platform", "eq.news");
    url.searchParams.set("order", "id.asc");
    extra(url);
    return url;
  };

  if (params.sourceIds && params.sourceIds.length > 0) {
    const url = baseUrl((u) => {
      u.searchParams.set("id", `in.(${params.sourceIds!.join(",")})`);
      u.searchParams.set("limit", String(params.sourceIds!.length));
    });
    const rows = (await restGet(url, params.serviceRoleKey)) as DigitalRow[];
    const found = new Map(rows.map((r) => [r.id, r]));
    const items: ContentItemDTO[] = [];
    const report: SourceIdReportEntry[] = [];
    for (const id of params.sourceIds) {
      const row = found.get(id);
      if (!row) {
        // Either non-Digital (twitter/instagram/NULL) or absent; distinguished
        // by a second identity-only probe without the platform restriction.
        const probe = new URL("/rest/v1/news_articles", params.supabaseUrl);
        probe.searchParams.set("select", "id");
        probe.searchParams.set("id", `eq.${id}`);
        probe.searchParams.set("limit", "1");
        const exists = (await restGet(probe, params.serviceRoleKey)).length > 0;
        report.push({
          source_id: id,
          disposition: exists ? "rejected_non_digital" : "not_found",
        });
        continue;
      }
      try {
        items.push(mapDigitalRow(row, lookup));
        report.push({ source_id: id, disposition: "found_digital" });
      } catch (error) {
        report.push({
          source_id: id,
          disposition: "mapping_failed",
          error: (error as Error).message,
        });
      }
    }
    return { items, source_id_report: report };
  }

  const items: ContentItemDTO[] = [];
  let offset = 0;
  for (;;) {
    const remaining = params.limit ? params.limit - items.length : PAGE_SIZE;
    const pageSize = Math.min(PAGE_SIZE, remaining);
    if (pageSize <= 0) break;
    const url = baseUrl((u) => {
      u.searchParams.set("limit", String(pageSize));
      u.searchParams.set("offset", String(offset));
    });
    const rows = (await restGet(url, params.serviceRoleKey)) as DigitalRow[];
    for (const row of rows) items.push(mapDigitalRow(row, lookup));
    if (rows.length < pageSize) break;
    offset += rows.length;
  }
  return { items };
}
