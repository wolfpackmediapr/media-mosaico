/**
 * Portal run finalization — internal Publiteca sender (CP3 Phase F).
 *
 * One-way, HMAC-signed POST to the Portal finalize route. This module holds no
 * credentials: the key id and secret are passed in by the caller from the
 * internal Edge Function environment and are never logged or returned. All
 * signing reuses the approved eight-line canonical request in `signing.ts`;
 * no HMAC logic is duplicated here.
 */

import { SCHEMA_VERSION, SCHEMA_VERSION_HEADER, sha256Hex, signRequest } from "./signing.ts";

export const FINALIZE_PATH = "/api/public/ingest/finalize";

/**
 * Deterministic, bounded finalize batch id: the literal prefix `finalize:`
 * (9 chars) plus the first 32 hex chars of SHA-256(run_key) — always exactly
 * 41 characters, far below the Portal's 200-character limit. Never derived by
 * appending to an arbitrary-length run key.
 */
export const FINALIZE_BATCH_ID_LENGTH = 41;

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

export interface FinalizeResult {
  status: number;
  response: unknown;
  batch_id: string;
  /** Present only when the finalize response body was not valid JSON. */
  parse_error?: string;
}

export async function buildFinalizeBatchId(runKey: string): Promise<string> {
  return `finalize:${(await sha256Hex(runKey)).slice(0, 32)}`;
}

/**
 * Sends exactly one finalize request. `fetchImpl` is NOT caller-controlled in
 * production: the Edge Function calls this helper without it, and it exists
 * only as an in-process test seam.
 */
export async function finalizePortalRun(params: {
  portalBaseUrl: string;
  runKey: string;
  keyId: string;
  secret: string;
  fetchImpl?: FetchImpl;
}): Promise<FinalizeResult> {
  const timestamp = new Date().toISOString();
  const batchId = await buildFinalizeBatchId(params.runKey);

  // Serialized exactly once; these bytes are hashed, signed and transmitted.
  const bodyString = JSON.stringify({
    schema_version: SCHEMA_VERSION,
    run_key: params.runKey,
    batch_id: batchId,
    request_timestamp: timestamp,
  });

  const signed = await signRequest({
    baseUrl: params.portalBaseUrl,
    path: FINALIZE_PATH,
    keyId: params.keyId,
    secret: params.secret,
    timestamp,
    batchId,
    bodyString,
    schemaVersion: SCHEMA_VERSION_HEADER,
  });

  const doFetch: FetchImpl = params.fetchImpl ??
    ((input, init) => fetch(input, init));

  const response = await doFetch(signed.url, {
    method: "POST",
    headers: { ...signed.headers },
    body: signed.body,
  });

  const text = await response.text();
  let parsed: unknown = null;
  let parseError: string | undefined;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
    parseError = "INVALID_JSON_RESPONSE";
  }

  return {
    status: response.status,
    response: parsed,
    batch_id: batchId,
    ...(parseError ? { parse_error: parseError } : {}),
  };
}

/** True only for a genuinely accepted finalize: 2xx AND parsed body with ok === true. */
export function isFinalizeAccepted(result: FinalizeResult): boolean {
  if (result.status < 200 || result.status >= 300) return false;
  if (result.parse_error) return false;
  const body = result.response as { ok?: unknown } | null;
  return !!body && body.ok === true;
}

/** Terminal lifecycle status the Portal records for a finalized sync run. */
export type FinalizedRunStatus = "completed" | "failed";

export type FinalizedRunOutcome = "completed" | "failed" | "protocol_error";

/**
 * Endpoint acceptance is NOT run success: the Portal answers 200 / ok:true even
 * when `portal_finalize_sync_run` recorded `status="failed"` (items_failed > 0).
 * This reads `report.run.status` strictly and fails closed on anything the
 * contract does not define.
 */
export function classifyFinalizedRun(result: FinalizeResult): { outcome: FinalizedRunOutcome } {
  const body = result.response as
    | { report?: { run?: { status?: unknown } | null } | null }
    | null;
  const status = body?.report?.run?.status;
  if (status === "completed") return { outcome: "completed" };
  if (status === "failed") return { outcome: "failed" };
  return { outcome: "protocol_error" };
}

