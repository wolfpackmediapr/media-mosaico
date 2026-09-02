/**
 * Internal Publiteca Edge Function: `portal-sender`.
 *
 * SOURCE ONLY — not deployed by this project. One-way HMAC-signed HTTPS push of
 * the client mirror to the Portal ingest routes. This function holds NO Portal
 * service-role key, no Portal database credential, and never reads from Portal.
 */

import { authorize } from "./auth.ts";
import { chunk, fetchInternalClients, type ClientItemDTO } from "./clients.ts";
import { SCHEMA_VERSION, SCHEMA_VERSION_HEADER, signRequest, verifyTestVector } from "./signing.ts";

const CLIENTS_PATH = "/api/public/ingest/clients";
const MAX_ITEMS_PER_BATCH = 500;

interface SenderRequest {
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
 * Authorization: the bearer token is VERIFIED, never string-compared against
 * SUPABASE_SERVICE_ROLE_KEY. Accepted callers are (a) a valid JWT whose `role`
 * claim is `service_role`, or (b) a valid user JWT belonging to an internal
 * Publiteca administrator. The credential is never echoed or logged.
 */
async function authorize(request: Request): Promise<{ ok: true; actor: string } | { ok: false; response: Response }> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: json({ ok: false, code: "MISSING_AUTHORIZATION" }, 401) };
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, response: json({ ok: false, code: "INTERNAL_RUNTIME_NOT_CONFIGURED" }, 500) };
  }

  let claims: Record<string, unknown> | null = null;
  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    // Verifies signature/expiry server-side; returns the decoded claims.
    const { data, error } = await admin.auth.getClaims(token);
    if (error || !data?.claims) throw error ?? new Error("no claims");
    claims = data.claims as Record<string, unknown>;
  } catch {
    return { ok: false, response: json({ ok: false, code: "INVALID_TOKEN" }, 401) };
  }

  if (claims["role"] === "service_role") {
    return { ok: true, actor: "service_role" };
  }

  const userId = typeof claims["sub"] === "string" ? (claims["sub"] as string) : "";
  if (!userId) {
    return { ok: false, response: json({ ok: false, code: "FORBIDDEN" }, 403) };
  }

  // Internal Publiteca administrator check (read-only role lookup).
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "administrator",
  });
  if (roleError || isAdmin !== true) {
    return { ok: false, response: json({ ok: false, code: "FORBIDDEN" }, 403) };
  }
  return { ok: true, actor: `admin:${userId}` };
}

function buildEnvelopeBody(params: {
  runKey: string;
  batchId: string;
  sequenceNo: number;
  mode: "dry_run" | "apply";
  requestTimestamp: string;
  items: ClientItemDTO[];
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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const auth = await authorize(request);
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

  let items: ClientItemDTO[];
  try {
    items = await fetchInternalClients({
      supabaseUrl,
      serviceRoleKey,
      ...(body.limit ? { limit: body.limit } : {}),
    });
  } catch (error) {
    return json({ ok: false, code: "SOURCE_READ_FAILED", message: (error as Error).message }, 500);
  }

  const batchSize = Math.min(Math.max(body.batch_size ?? MAX_ITEMS_PER_BATCH, 1), MAX_ITEMS_PER_BATCH);
  // New per invocation. Retry/resume/replay tests MUST pass the original value.
  const runKey = body.run_key ?? `clients-${crypto.randomUUID()}`;
  const batches = chunk(items, batchSize);

  const report: unknown[] = [];
  let previousBatchId: string | null = null;
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
      let responseBody: unknown = null;
      try {
        const response = await fetch(original.url, {
          method: original.method,
          headers: { ...original.headers },
          body: original.body,
        });
        status = response.status;
        responseBody = await response.json().catch(() => null);
      } catch (error) {
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
      report.push({
        sequence_no: original.sequenceNo,
        batch_id: original.batchId,
        replay_of: original.batchId,
        exact_replay: true,
        item_count: original.itemCount,
        skipped_batch_index: index,
        status,
        response: responseBody,
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
      path: CLIENTS_PATH,
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
    let responseBody: unknown = null;
    try {
      const response = await fetch(signed.url, { method: "POST", headers, body: transmitted });
      status = response.status;
      responseBody = await response.json().catch(() => null);
    } catch (error) {
      report.push({ sequence_no: sequenceNo, batch_id: batchId, error: (error as Error).message });
      continue;
    }

    report.push({
      sequence_no: sequenceNo,
      batch_id: batchId,
      item_count: batches[index]!.length,
      status,
      response: responseBody,
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

  return json({
    ok: true,
    actor: auth.actor,
    mode,
    run_key: runKey,
    schema_version: SCHEMA_VERSION,
    total_items: items.length,
    batch_count: batches.length,
    test_vector_ok: vector.ok,
    diagnostics_applied: requested,
    batches: report,
  });
});
