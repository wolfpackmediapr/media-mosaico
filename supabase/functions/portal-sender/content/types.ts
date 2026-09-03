/**
 * Portal content ingest DTOs — internal Publiteca sender (CP5 Phase C3A).
 *
 * These types describe ONLY what the sender is allowed to emit for
 * `kind=content`. Unsupported optional fields are deliberately absent from the
 * DTO so they can never be fabricated by mapping code.
 */

export const CONTENT_PATH = "/api/public/ingest/content";

/** Portal accepts at most 200 content items per ingest request. */
export const MAX_CONTENT_ITEMS_PER_BATCH = 200;

/** Hard upper bound on caller-provided pilot selectors. */
export const MAX_SOURCE_IDS = 200;

/** Single deterministic constant identifying the internal analysis producer. */
export const DIGITAL_SENTIMENT_SOURCE = "publiteca-internal-news-analysis";

export type PortalSentiment = "positive" | "neutral" | "negative" | "mixed";

/** Case/outer-whitespace normalization only; anything else is not sentiment. */
export const SENTIMENT_ALLOW_LIST: Record<string, PortalSentiment> = {
  positive: "positive",
  positivo: "positive",
  neutral: "neutral",
  neutro: "neutral",
  negative: "negative",
  negativo: "negative",
  mixed: "mixed",
  mixto: "mixed",
};

export function normalizeSentiment(raw: unknown): PortalSentiment | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  return SENTIMENT_ALLOW_LIST[key] ?? null;
}

/**
 * A mention is an identity claim, never an enrichment claim. `relevance`,
 * `relevance_score` and per-mention sentiment are intentionally not modeled.
 */
export interface MentionDTO {
  /** Canonical `public.clients.id`. Present only on confident resolution. */
  raw_client_id?: string;
  /** Original source name as stored by the internal pipeline. */
  raw_client_name?: string;
  /** Only when defensibly tied to this specific client. */
  matched_keywords?: string[];
}

export interface ContentItemDTO {
  source_type: "digital";
  source_id: string;
  source_updated_at: string;
  source_state: "active";
  effective_at: string;
  effective_at_estimated: false;

  title: string;
  summary?: string;
  body_text?: string;
  category?: string;
  media_outlet?: string;
  article_url?: string;
  image_url?: string;
  has_media: boolean;

  sentiment?: PortalSentiment;
  sentiment_score?: number;
  sentiment_source?: string;

  mentions: MentionDTO[];
  metadata?: Record<string, unknown>;
}

/** Per-source-id disposition so a requested row can never silently vanish. */
export type SourceIdDisposition =
  | "found_digital"
  | "rejected_non_digital"
  | "not_found"
  | "mapping_failed";

export interface SourceIdReportEntry {
  source_id: string;
  disposition: SourceIdDisposition;
  error?: string;
}
