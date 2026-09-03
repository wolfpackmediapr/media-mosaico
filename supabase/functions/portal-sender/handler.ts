/**
 * Internal Publiteca Edge Function handler: `portal-sender`.
 *
 * SOURCE ONLY — one-way HMAC-signed HTTPS push of the client mirror to the
 * Portal ingest routes, followed (CP3 Phase F) by automatic lifecycle
 * finalization for clean, non-diagnostic runs. This handler holds NO Portal
 * service-role key, no Portal database credential, and never reads from Portal.
 *
 * The exported `handleRequest` is the single testable entrypoint. `index.ts`
 * contains only `Deno.serve((request) => handleRequest(request));` so that
 * importing this module in tests never starts a listener, and so Deno's
 * `ServeHandlerInfo` second argument can never be mistaken for injected
 * dependencies.
 */

import { authorize, type AuthorizeResult } from "./auth.ts";
import { chunk, fetchInternalClients, type ClientItemDTO } from "./clients.ts";
import { SCHEMA_VERSION, SCHEMA_VERSION_HEADER, signRequest, verifyTestVector } from "./signing.ts";
import {
  classifyFinalizedRun,
  finalizePortalRun,
  isFinalizeAccepted,
  type FetchImpl,
  type FinalizeResult,
} from "./finalize.ts";
import {
  CONTENT_PATH,
  MAX_CONTENT_ITEMS_PER_BATCH,
  MAX_SOURCE_IDS,
  type ContentItemDTO,
  type SourceIdReportEntry,
} from "./content/types.ts";
import { fetchDigitalContent, isUuid, type DigitalFetchResult } from "./content/digital.ts";


const CLIENTS_PATH = "/api/public/ingest/clients";
const MAX_ITEMS_PER_BATCH = 500;

type ItemDTO = ClientItemDTO | ContentItemDTO;

interface SenderRequest {
  /** Absent means `clients`: existing behavior is preserved byte-for-byte. */
  kind?: "clients" | "content";
  /** Required for kind=content. Only "digital" is supported in CP5 C3A. */
  media?: string;
  /** UUID-only pilot selector for kind=content. */
  source_ids?: string[];
  mode?: "dry_run" | "apply";
  allow_apply?: boolean;
  run_key?: string;
  limit?: number;
  batch_size?: number;
  diagnostics?: {
    corrupt_signature?: boolean;
    tamper_path?: boolean;
    tamper_body_after_sign?: boolean;
    replay_previous_batch?: boolean;
    collide_batch_id?: boolean;
    tamper_query?: boolean;
  };
}

/**
 * Not caller-controlled: production `index.ts` calls `handleRequest(request)`.
 * These optional dependencies exist exclusively as in-process test seams.
 */
export interface HandlerDependencies {
  fetchImpl?: FetchImpl;
  authorizeImpl?: (request: Request) => Promise<AuthorizeResult>;
  finalizeImpl?: (params: {
    portalBaseUrl: string;
    runKey: string;
    keyId: string;
    secret: string;
    fetchImpl?: FetchImpl;
  }) => Promise<FinalizeResult>;
  fetchClientsImpl?: (params: {
    supabaseUrl: string;
    serviceRoleKey: string;
    limit?: number;
  }) => Promise<ClientItemDTO[]>;
  fetchDigitalImpl?: (params: {
    supabaseUrl: string;
    serviceRoleKey: string;
    limit?: number;
    sourceIds?: string[];
  }) => Promise<DigitalFetchResult>;
}

const ALLOWED_DIAGNOSTICS = [
  "corrupt_signature",
  "tamper_path",
  "tamper_body_after_sign",
  "replay_previous_batch",
  "collide_batch_id",
  "tamper_query",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function env(name: string): string | undefined {
  // deno-lint-ignore no-explicit-any
  return (globalThis as any).Deno?.env?.get(name);
}

/**
 * Authorization lives in ./auth.ts: the bearer token is VERIFIED (getClaims,
 * with a getUser fallback only when verification itself fails), never
 * string-compared against SUPABASE_SERVICE_ROLE_KEY. Accepted callers are a
 * verified `service_role` JWT or a verified internal Publiteca administrator.
 * The credential is never echoed or logged.
 */

function buildEnvelopeBody(params: {
  runKey: string;
  batchId: string;
  sequenceNo: number;
  mode: "dry_run" | "apply";
  requestTimestamp: string;
  items: ItemDTO[];
}): string {
  // Serialized exactly once; these bytes are hashed, signed and transmitted.
  return JSON.stringify({
    schema_version: SCHEMA_VERSION,
    run_key: params.runKey,
    batch_id: params.batchId,
    sequence_no: params.sequenceNo,
    mode: params.mode,
    request_timestamp: params.requestTimestamp,
    items: params.items,
  });
}

/** A batch is accepted ONLY on 2xx + parsed JSON body + `ok === true`. */
function isBatchAccepted(status: number, parsed: unknown, parseError?: string): boolean {
  if (status < 200 || status >= 300) return false;
  if (parseError) return false;
  const body = parsed as { ok?: unknown } | null;
  return !!body && body.ok === true;
}

async function readBody(
  response: Response,
): Promise<{ parsed: unknown; parseError?: string }> {
  const text = await response.text();
  try {
    return { parsed: JSON.parse(text) };
  } catch {
    return { parsed: null, parseError: "INVALID_JSON_RESPONSE" };
  }
}

export async function handleRequest(
  request: Request,
  deps?: HandlerDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const auth = await (deps?.authorizeImpl ?? authorize)(request);
  if (!auth.ok) return auth.response;

  let body: SenderRequest = {};
  if (request.headers.get("content-length") !== "0") {
    try {
      body = ((await request.json()) ?? {}) as SenderRequest;
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }
  }

  const mode = body.mode ?? "dry_run";
  if (mode !== "dry_run" && mode !== "apply") {
    return json({ ok: false, code: "INVALID_MODE" }, 400);
  }

  // Strict request combinations: contradictory parameters are rejected, never
  // silently ignored. `kind` absent keeps the legacy clients behavior exactly.
  const kind = body.kind ?? "clients";
  if (kind !== "clients" && kind !== "content") {
    return json({ ok: false, code: "INVALID_KIND" }, 400);
  }
  if (kind === "clients") {
    if (body.media !== undefined) {
      return json({ ok: false, code: "MEDIA_NOT_ALLOWED_FOR_CLIENTS" }, 400);
    }
    if (body.source_ids !== undefined) {
      return json({ ok: false, code: "SOURCE_IDS_NOT_ALLOWED_FOR_CLIENTS" }, 400);
    }
  }
  let sourceIds: string[] | undefined;
  if (kind === "content") {
    if (body.media === undefined) {
      return json({ ok: false, code: "MEDIA_REQUIRED" }, 400);
    }
    if (body.media !== "digital") {
      return json({ ok: false, code: "UNSUPPORTED_MEDIA", media: body.media }, 400);
    }
    if (body.source_ids !== undefined) {
      if (!Array.isArray(body.source_ids)) {
        return json({ ok: false, code: "INVALID_SOURCE_ID" }, 400);
      }
      const invalid = body.source_ids.filter((id) => !isUuid(id));
      if (invalid.length > 0) {
        return json({ ok: false, code: "INVALID_SOURCE_ID", invalid }, 400);
      }
      sourceIds = [...new Set(body.source_ids.map((id) => id.trim().toLowerCase()))];
      if (sourceIds.length > MAX_SOURCE_IDS) {
        return json({ ok: false, code: "TOO_MANY_SOURCE_IDS", max: MAX_SOURCE_IDS }, 400);
      }
    }
  }
  const ingestPath = kind === "content" ? CONTENT_PATH : CLIENTS_PATH;
  const maxBatchItems = kind === "content" ? MAX_CONTENT_ITEMS_PER_BATCH : MAX_ITEMS_PER_BATCH;
  if (body.batch_size !== undefined && body.batch_size > maxBatchItems) {
    return json({ ok: false, code: "BATCH_SIZE_TOO_LARGE", max: maxBatchItems }, 400);
  }

  // Triple gate: request mode + explicit allow_apply + server env flag.
  if (mode === "apply") {
    const envAllows = env("PORTAL_SENDER_ALLOW_APPLY") === "true";
    if (body.allow_apply !== true || !envAllows) {
      return json({ ok: false, code: "APPLY_DISABLED", message: "Apply requires mode=apply, allow_apply=true and PORTAL_SENDER_ALLOW_APPLY=true" }, 403);
    }
  }

  // Diagnostics are refused unless test mode is explicitly enabled.
  const diagnostics = body.diagnostics ?? {};
  const requested = Object.keys(diagnostics).filter((k) => (diagnostics as Record<string, unknown>)[k] === true);
  const unknown = Object.keys(diagnostics).filter((k) => !ALLOWED_DIAGNOSTICS.includes(k));
  if (unknown.length > 0) {
    return json({ ok: false, code: "UNKNOWN_DIAGNOSTIC", unknown }, 400);
  }
  if (requested.length > 0 && env("PORTAL_SENDER_TEST_MODE") !== "true") {
    return json({ ok: false, code: "TEST_MODE_DISABLED" }, 403);
  }

  const portalUrl = env("PORTAL_INGEST_URL");
  const keyId = env("PORTAL_INGEST_KEY_ID");
  const secret = env("PORTAL_INGEST_SECRET");
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!portalUrl || !keyId || !secret || !supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, code: "SENDER_NOT_CONFIGURED" }, 500);
  }

  const vector = await verifyTestVector();
  const doFetch: FetchImpl = deps?.fetchImpl ?? ((input, init) => fetch(input, init));

  let items: ItemDTO[];
  let sourceIdReport: SourceIdReportEntry[] | undefined;
  try {
    if (kind === "content") {
      const readDigital = deps?.fetchDigitalImpl ?? fetchDigitalContent;
      const result = await readDigital({
        supabaseUrl,
        serviceRoleKey,
        ...(body.limit ? { limit: body.limit } : {}),
        ...(sourceIds ? { sourceIds } : {}),
      });
      items = result.items;
      sourceIdReport = result.source_id_report;
    } else {
      const readClients = deps?.fetchClientsImpl ?? fetchInternalClients;
      items = await readClients({
        supabaseUrl,
        serviceRoleKey,
        ...(body.limit ? { limit: body.limit } : {}),
      });
    }
  } catch (error) {
    return json({ ok: false, code: "SOURCE_READ_FAILED", message: (error as Error).message }, 500);
  }

  const batchSize = Math.min(Math.max(body.batch_size ?? maxBatchItems, 1), maxBatchItems);
  // New per invocation. Retry/resume/replay tests MUST pass the original value.
  const runKey = body.run_key ??
    `${kind === "content" ? "content-digital" : "clients"}-${crypto.randomUUID()}`;
  const batches = chunk(items, batchSize);
  const intendedBatchCount = batches.length;

  const report: unknown[] = [];
  let previousBatchId: string | null = null;
  let acceptedBatchCount = 0;
  let transportFailure = false;
  let batchProtocolFailure = false;
  /** Exact bytes/headers/URL of the last transmitted request, for byte-for-byte replay. */
  let lastTransmitted:
    | {
        url: string;
        method: "POST";
        headers: Record<string, string>;
        body: string;
        batchId: string;
        sequenceNo: number;
        itemCount: number;
      }
    | null = null;

  for (let index = 0; index < batches.length; index++) {
    const sequenceNo = index;

    // Exact replay: retransmit the previously sent request byte-for-byte. No new
    // timestamp, no re-serialization, no re-hash, no new signature.
    if (diagnostics.replay_previous_batch && lastTransmitted) {
      const original = lastTransmitted;
      let status = 0;
      let parsed: unknown = null;
      let parseError: string | undefined;
      try {
        const response = await doFetch(original.url, {
          method: original.method,
          headers: { ...original.headers },
          body: original.body,
        });
        status = response.status;
        ({ parsed, parseError } = await readBody(response));
      } catch (error) {
        transportFailure = true;
        report.push({
          sequence_no: original.sequenceNo,
          batch_id: original.batchId,
          replay_of: original.batchId,
          exact_replay: true,
          skipped_batch_index: index,
          error: (error as Error).message,
        });
        continue;
      }
      if (!isBatchAccepted(status, parsed, parseError)) batchProtocolFailure = true;
      report.push({
        sequence_no: original.sequenceNo,
        batch_id: original.batchId,
        replay_of: original.batchId,
        exact_replay: true,
        item_count: original.itemCount,
        skipped_batch_index: index,
        status,
        response: parsed,
        ...(parseError ? { parse_error: parseError } : {}),
      });
      continue;
    }

    let batchId = `${runKey}:${sequenceNo}`;
    if (diagnostics.collide_batch_id && previousBatchId) batchId = previousBatchId;

    const timestamp = new Date().toISOString();
    const bodyString = buildEnvelopeBody({
      runKey,
      batchId,
      sequenceNo,
      mode,
      requestTimestamp: timestamp,
      items: batches[index]!,
    });

    const signed = await signRequest({
      baseUrl: portalUrl,
      path: ingestPath,
      keyId,
      secret,
      timestamp,
      batchId,
      bodyString,
      schemaVersion: SCHEMA_VERSION_HEADER,
      ...(diagnostics.tamper_path ? { signPathOverride: "/api/public/ingest/content" } : {}),
      ...(diagnostics.tamper_query ? { signQueryOverride: "x=1" } : {}),
    });

    const headers = { ...signed.headers };
    if (diagnostics.corrupt_signature) {
      headers[Object.keys(headers).find((h) => h === "x-portal-signature")!] =
        "0".repeat(signed.headers["x-portal-signature"]!.length);
    }
    const transmitted = diagnostics.tamper_body_after_sign
      ? bodyString.replace('"mode":"dry_run"', '"mode":"dry_run" ')
      : bodyString;

    let status = 0;
    let parsed: unknown = null;
    let parseError: string | undefined;
    try {
      const response = await doFetch(signed.url, { method: "POST", headers, body: transmitted });
      status = response.status;
      ({ parsed, parseError } = await readBody(response));
    } catch (error) {
      transportFailure = true;
      report.push({ sequence_no: sequenceNo, batch_id: batchId, error: (error as Error).message });
      continue;
    }

    if (isBatchAccepted(status, parsed, parseError)) {
      acceptedBatchCount++;
    } else {
      batchProtocolFailure = true;
    }

    report.push({
      sequence_no: sequenceNo,
      batch_id: batchId,
      item_count: batches[index]!.length,
      status,
      response: parsed,
      ...(parseError ? { parse_error: parseError } : {}),
    });
    previousBatchId = batchId;
    lastTransmitted = {
      url: signed.url,
      method: "POST",
      headers: { ...headers },
      body: transmitted,
      batchId,
      sequenceNo,
      itemCount: batches[index]!.length,
    };
  }

  const base = {
    ok: true,
    actor: auth.actor,
    // Legacy clients responses keep their exact pre-C3A field set: content
    // diagnostics (`kind`, `media`, `source_id_report`) are content-only.
    ...(kind === "content" ? { kind, media: "digital" } : {}),
    mode,
    run_key: runKey,
    schema_version: SCHEMA_VERSION,
    total_items: items.length,
    batch_count: intendedBatchCount,
    test_vector_ok: vector.ok,
    diagnostics_applied: requested,
    ...(kind === "content" && sourceIdReport ? { source_id_report: sourceIdReport } : {}),
    batches: report,
  };

  // Diagnostic runs are never production lifecycle runs: report as-is, never finalize.
  if (requested.length > 0) {
    return json({ ...base, finalize: { attempted: false, reason: "diagnostics_active" } });
  }

  // Nothing was sent: there is no Portal run to finalize (finalize would 404 / RUN_NOT_FOUND).
  if (intendedBatchCount === 0) {
    return json({ ...base, finalize: { attempted: false, reason: "no_batches" } });
  }

  // Partial or failed delivery must never look like sender success.
  if (transportFailure || batchProtocolFailure || acceptedBatchCount !== intendedBatchCount) {
    return json({
      ...base,
      ok: false,
      code: "BATCH_DELIVERY_FAILED",
      accepted_batch_count: acceptedBatchCount,
      intended_batch_count: intendedBatchCount,
      finalize: { attempted: false, reason: "batch_failure" },
      message:
        "One or more data batches may already have been accepted. Do not retry the full sender run automatically.",
    }, 502);
  }

  const runFinalize = deps?.finalizeImpl ?? finalizePortalRun;
  let finalizeResult: FinalizeResult | null = null;
  let finalizeError: string | null = null;
  try {
    finalizeResult = await runFinalize({
      portalBaseUrl: portalUrl,
      runKey,
      keyId,
      secret,
      ...(deps?.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
    });
  } catch (error) {
    finalizeError = (error as Error).message;
  }

  if (finalizeResult && isFinalizeAccepted(finalizeResult)) {
    const finalizeEnvelope = {
      attempted: true,
      status: finalizeResult.status,
      batch_id: finalizeResult.batch_id,
      response: finalizeResult.response,
    };
    const { outcome } = classifyFinalizedRun(finalizeResult);

    // Finalize was accepted AND the Portal recorded a completed run.
    if (outcome === "completed") {
      return json({ ...base, finalize: finalizeEnvelope });
    }

    // Finalize succeeded, but the run itself failed (items_failed > 0).
    if (outcome === "failed") {
      return json({
        ...base,
        ok: false,
        code: "RUN_FINALIZED_FAILED",
        finalize: finalizeEnvelope,
        message:
          "The Portal finalized this sync run with status=failed. Do not retry the full sender run automatically.",
      }, 502);
    }

    // Fail closed: missing report / run / status, or an undefined status value.
    return json({
      ...base,
      ok: false,
      code: "FINALIZE_PROTOCOL_ERROR",
      finalize: finalizeEnvelope,
      message:
        "The Portal finalize response did not contain a recognized report.run.status. Do not retry the full sender run automatically.",
    }, 502);
  }


  return json({
    ...base,
    ok: false,
    code: "FINALIZE_FAILED",
    finalize: {
      attempted: true,
      ...(finalizeResult
        ? {
            status: finalizeResult.status,
            batch_id: finalizeResult.batch_id,
            response: finalizeResult.response,
            ...(finalizeResult.parse_error ? { parse_error: finalizeResult.parse_error } : {}),
          }
        : { error: finalizeError }),
    },
    message: "Data batches were already accepted. Do not retry the full sender run.",
  }, 502);
}
