/**
 * CP3 Phase F tests — automatic run finalization.
 *
 * Deterministic and fully in-process: `handleRequest` is imported from
 * `handler.ts` (never `index.ts`), so `Deno.serve` is never executed and never
 * stubbed. All network access is replaced by an injected `fetchImpl` stub and
 * an injected clients reader; authorization is replaced by a test seam.
 */

import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleRequest, type HandlerDependencies } from "./handler.ts";
import { buildFinalizeBatchId, FINALIZE_PATH } from "./finalize.ts";
import { canonicalQueryFromUrl, sha256Hex } from "./signing.ts";
import type { ClientItemDTO } from "./clients.ts";

const PORTAL_URL = "https://portal.example.test";

Deno.env.set("PORTAL_INGEST_URL", PORTAL_URL);
Deno.env.set("PORTAL_INGEST_KEY_ID", "cp3-test-key");
Deno.env.set("PORTAL_INGEST_SECRET", "cp3-test-secret");
Deno.env.set("SUPABASE_URL", "https://internal.example.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "internal-service-role");

interface Recorded {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

function items(count: number): ClientItemDTO[] {
  return Array.from({ length: count }, (_, i) => ({
    client_id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    name: `Cliente ${i + 1}`,
    is_active: true,
    source_updated_at: "2025-12-31T23:59:59.000Z",
    source_state: "active" as const,
  }));
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain" } });
}

interface Harness {
  calls: Recorded[];
  finalizeCalls: Recorded[];
  batchCalls: Recorded[];
  deps: HandlerDependencies;
}

function harness(options: {
  itemCount?: number;
  batchResponder?: (call: Recorded, index: number) => Response | Promise<Response>;
  finalizeResponder?: (call: Recorded) => Response | Promise<Response>;
}): Harness {
  const calls: Recorded[] = [];
  const finalizeCalls: Recorded[] = [];
  const batchCalls: Recorded[] = [];
  let batchIndex = 0;

  const deps: HandlerDependencies = {
    authorizeImpl: () => Promise.resolve({ ok: true as const, actor: "service_role" }),
    fetchClientsImpl: () => Promise.resolve(items(options.itemCount ?? 2)),
    fetchImpl: (input, init) => {
      const headers = { ...((init.headers ?? {}) as Record<string, string>) };
      const call: Recorded = {
        url: String(input),
        method: String(init.method),
        headers,
        body: String(init.body),
      };
      calls.push(call);
      if (new URL(call.url).pathname === FINALIZE_PATH) {
        finalizeCalls.push(call);
        const responder = options.finalizeResponder ??
          (() => jsonResponse(200, { ok: true, report: { run: { status: "completed" } } }));

        return Promise.resolve(responder(call));
      }
      batchCalls.push(call);
      const index = batchIndex++;
      const responder = options.batchResponder ??
        (() => jsonResponse(200, { ok: true }));
      return Promise.resolve(responder(call, index));
    },
  };

  return { calls, finalizeCalls, batchCalls, deps };
}

function senderRequest(body: Record<string, unknown>): Request {
  return new Request("https://internal.functions.test/portal-sender", {
    method: "POST",
    headers: { authorization: "Bearer test-token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function run(
  body: Record<string, unknown>,
  h: Harness,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await handleRequest(senderRequest(body), h.deps);
  return { status: response.status, payload: await response.json() };
}

// 1 — normal dry run, all batches accepted → finalize called exactly once.
Deno.test("normal dry_run with accepted batches finalizes exactly once", async () => {
  const h = harness({ itemCount: 3 });
  const { status, payload } = await run({ mode: "dry_run", run_key: "t-dry", batch_size: 1 }, h);
  assertEquals(status, 200);
  assertEquals(payload.ok, true);
  assertEquals(h.batchCalls.length, 3);
  assertEquals(h.finalizeCalls.length, 1);
  const finalize = payload.finalize as Record<string, unknown>;
  assertEquals(finalize.attempted, true);
  assertEquals(finalize.status, 200);
});

// 2 — normal apply, all batches accepted → finalize called exactly once.
Deno.test("normal apply with accepted batches finalizes exactly once", async () => {
  Deno.env.set("PORTAL_SENDER_ALLOW_APPLY", "true");
  try {
    const h = harness({ itemCount: 2 });
    const { status, payload } = await run(
      { mode: "apply", allow_apply: true, run_key: "t-apply", batch_size: 1 },
      h,
    );
    assertEquals(status, 200);
    assertEquals(payload.ok, true);
    assertEquals(h.finalizeCalls.length, 1);
  } finally {
    Deno.env.set("PORTAL_SENDER_ALLOW_APPLY", "false");
  }
});

// 3,4,5,6,7,8,9 — finalize request shape.
Deno.test("finalize request URL, query, body and headers are exact", async () => {
  const h = harness({ itemCount: 1 });
  await run({ mode: "dry_run", run_key: "t-shape" }, h);
  assertEquals(h.finalizeCalls.length, 1);
  const call = h.finalizeCalls[0]!;
  const url = new URL(call.url);

  // 3 — exact path.
  assertEquals(url.pathname, FINALIZE_PATH);
  // 4 — blank canonical query.
  assertEquals(canonicalQueryFromUrl(url), "");

  // 5 — body has exactly the four required fields, no extras.
  const parsed = JSON.parse(call.body) as Record<string, unknown>;
  assertEquals(Object.keys(parsed).sort(), [
    "batch_id",
    "request_timestamp",
    "run_key",
    "schema_version",
  ]);
  assertEquals(parsed.run_key, "t-shape");

  // 6 — header timestamp equals body request_timestamp.
  assertEquals(call.headers["x-portal-timestamp"], parsed.request_timestamp);
  // 7 — header batch id equals body batch_id.
  assertEquals(call.headers["x-portal-batch-id"], parsed.batch_id);
  assertEquals(parsed.batch_id, await buildFinalizeBatchId("t-shape"));
  assert(String(parsed.batch_id).length === 41);
  // 8 — schema version is exactly 1 in header and body.
  assertEquals(call.headers["x-portal-schema-version"], "1");
  assertEquals(parsed.schema_version, 1);
  // 8b — exactly the five transport headers, key id included.
  assertEquals(call.headers["x-portal-key-id"], "cp3-test-key");
  assertEquals(
    Object.keys(call.headers).filter((h) => h.startsWith("x-portal-")).sort(),
    [
      "x-portal-batch-id",
      "x-portal-key-id",
      "x-portal-schema-version",
      "x-portal-signature",
      "x-portal-timestamp",
    ],
  );

  // 9 — the exact serialized bytes are what got hashed, signed and sent.
  const canonical = [
    "POST",
    FINALIZE_PATH,
    "",
    "1",
    "cp3-test-key",
    call.headers["x-portal-timestamp"],
    call.headers["x-portal-batch-id"],
    await sha256Hex(call.body),
  ].join("\n");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("cp3-test-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical))),
  ).map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(call.headers["x-portal-signature"], signature);
});

// 10 — diagnostics active → zero finalize calls.
Deno.test("diagnostics active never finalizes", async () => {
  Deno.env.set("PORTAL_SENDER_TEST_MODE", "true");
  try {
    const h = harness({ itemCount: 2 });
    const { status, payload } = await run(
      { mode: "dry_run", run_key: "t-diag", batch_size: 1, diagnostics: { corrupt_signature: true } },
      h,
    );
    assertEquals(status, 200);
    assertEquals(h.finalizeCalls.length, 0);
    assertEquals(payload.finalize, { attempted: false, reason: "diagnostics_active" });
  } finally {
    Deno.env.set("PORTAL_SENDER_TEST_MODE", "false");
  }
});

// diagnostics + intentionally rejected batch → diagnostic report, no lifecycle failure.
Deno.test("diagnostics with rejected batch returns diagnostic report and no finalize", async () => {
  Deno.env.set("PORTAL_SENDER_TEST_MODE", "true");
  try {
    const h = harness({
      itemCount: 1,
      batchResponder: () => jsonResponse(401, { ok: false, code: "INVALID_SIGNATURE" }),
    });
    const { status, payload } = await run(
      { mode: "dry_run", run_key: "t-diag2", diagnostics: { corrupt_signature: true } },
      h,
    );
    assertEquals(status, 200);
    assertEquals(payload.ok, true);
    assertEquals(h.finalizeCalls.length, 0);
    assertEquals(payload.finalize, { attempted: false, reason: "diagnostics_active" });
  } finally {
    Deno.env.set("PORTAL_SENDER_TEST_MODE", "false");
  }
});

// 11,12,13 + normal-run lifecycle failure — batch 401 / 409 / 500.
for (const code of [401, 409, 500]) {
  Deno.test(`normal run with batch ${code} skips finalize and returns 502`, async () => {
    const h = harness({
      itemCount: 2,
      batchResponder: (_call, index) =>
        index === 1 ? jsonResponse(code, { ok: false }) : jsonResponse(200, { ok: true }),
    });
    const { status, payload } = await run(
      { mode: "dry_run", run_key: `t-batch-${code}`, batch_size: 1 },
      h,
    );
    assertEquals(h.finalizeCalls.length, 0);
    assertEquals(status, 502);
    assertEquals(payload.ok, false);
    assertEquals(payload.code, "BATCH_DELIVERY_FAILED");
    assertEquals(payload.finalize, { attempted: false, reason: "batch_failure" });
  });
}

// 14 — batch transport exception after an earlier accepted batch.
Deno.test("batch transport failure skips finalize and returns 502", async () => {
  const h = harness({
    itemCount: 2,
    batchResponder: (_call, index) => {
      if (index === 1) throw new Error("connection reset");
      return jsonResponse(200, { ok: true });
    },
  });
  const { status, payload } = await run(
    { mode: "dry_run", run_key: "t-transport", batch_size: 1 },
    h,
  );
  assertEquals(h.finalizeCalls.length, 0);
  assertEquals(status, 502);
  assertEquals(payload.code, "BATCH_DELIVERY_FAILED");
  assertEquals(payload.accepted_batch_count, 1);
  assertEquals(payload.intended_batch_count, 2);
});

// 21 — acceptedBatchCount !== intendedBatchCount → no finalize.
Deno.test("accepted batch count below intended count skips finalize", async () => {
  const h = harness({
    itemCount: 3,
    batchResponder: (_call, index) =>
      index === 2 ? jsonResponse(200, { ok: false }) : jsonResponse(200, { ok: true }),
  });
  const { status, payload } = await run(
    { mode: "dry_run", run_key: "t-count", batch_size: 1 },
    h,
  );
  assertEquals(h.finalizeCalls.length, 0);
  assertEquals(status, 502);
  assertEquals(payload.accepted_batch_count, 2);
  assertEquals(payload.intended_batch_count, 3);
});

// 24,25,26 — batch 200 with ok:false / non-JSON / missing ok → no finalize.
Deno.test("batch 200 with ok:false is not accepted", async () => {
  const h = harness({ itemCount: 1, batchResponder: () => jsonResponse(200, { ok: false }) });
  const { status } = await run({ mode: "dry_run", run_key: "t-okfalse" }, h);
  assertEquals(h.finalizeCalls.length, 0);
  assertEquals(status, 502);
});

Deno.test("batch 200 with malformed body is not accepted", async () => {
  const h = harness({ itemCount: 1, batchResponder: () => textResponse(200, "<html>nope") });
  const { status, payload } = await run({ mode: "dry_run", run_key: "t-malformed" }, h);
  assertEquals(h.finalizeCalls.length, 0);
  assertEquals(status, 502);
  const batches = payload.batches as Array<Record<string, unknown>>;
  assertEquals(batches[0]!.parse_error, "INVALID_JSON_RESPONSE");
});

Deno.test("batch 200 with missing ok is not accepted", async () => {
  const h = harness({ itemCount: 1, batchResponder: () => jsonResponse(200, { report: {} }) });
  const { status } = await run({ mode: "dry_run", run_key: "t-missingok" }, h);
  assertEquals(h.finalizeCalls.length, 0);
  assertEquals(status, 502);
});

// Zero source batches — dry_run and apply.
Deno.test("zero items in dry_run is an explicit no-op without finalize", async () => {
  const h = harness({ itemCount: 0 });
  const { status, payload } = await run({ mode: "dry_run", run_key: "t-empty" }, h);
  assertEquals(status, 200);
  assertEquals(payload.ok, true);
  assertEquals(payload.total_items, 0);
  assertEquals(payload.batch_count, 0);
  assertEquals(payload.batches, []);
  assertEquals(payload.finalize, { attempted: false, reason: "no_batches" });
  assertEquals(h.calls.length, 0);
});

Deno.test("zero items in apply is an explicit no-op without finalize", async () => {
  Deno.env.set("PORTAL_SENDER_ALLOW_APPLY", "true");
  try {
    const h = harness({ itemCount: 0 });
    const { status, payload } = await run(
      { mode: "apply", allow_apply: true, run_key: "t-empty-apply" },
      h,
    );
    assertEquals(status, 200);
    assertEquals(payload.finalize, { attempted: false, reason: "no_batches" });
    assertEquals(h.calls.length, 0);
  } finally {
    Deno.env.set("PORTAL_SENDER_ALLOW_APPLY", "false");
  }
});

// 15 — finalize 200 + ok:true + run.status=completed → lifecycle success.
Deno.test("finalize 200 ok true and run completed is sender success", async () => {
  const h = harness({
    itemCount: 1,
    finalizeResponder: () =>
      jsonResponse(200, {
        ok: true,
        report: { run: { status: "completed" }, items_failed: 0 },
      }),
  });
  const { status, payload } = await run({ mode: "dry_run", run_key: "t-ok" }, h);
  assertEquals(status, 200);
  assertEquals(payload.ok, true);
  const finalize = payload.finalize as Record<string, unknown>;
  assertEquals(finalize.attempted, true);
  assertEquals((finalize.response as Record<string, unknown>).ok, true);
});

// Finalize accepted, but the Portal recorded a failed run → RUN_FINALIZED_FAILED.
Deno.test("finalize 200 ok true with run failed is RUN_FINALIZED_FAILED", async () => {
  const h = harness({
    itemCount: 2,
    finalizeResponder: () =>
      jsonResponse(200, {
        ok: true,
        report: { run: { status: "failed" }, items_failed: 3 },
      }),
  });
  const { status, payload } = await run(
    { mode: "dry_run", run_key: "t-run-failed", batch_size: 1 },
    h,
  );
  assertEquals(status, 502);
  assertEquals(payload.ok, false);
  assertEquals(payload.code, "RUN_FINALIZED_FAILED");
  assertEquals(h.batchCalls.length, 2, "no data batch may be resent");
  assertEquals(h.finalizeCalls.length, 1);
  const finalize = payload.finalize as Record<string, unknown>;
  assertEquals(finalize.attempted, true);
  assertEquals(finalize.status, 200);
  assert(String(finalize.batch_id).startsWith("finalize:"));
  assertEquals(
    payload.message,
    "The Portal finalized this sync run with status=failed. Do not retry the full sender run automatically.",
  );
});

// Fail closed on a finalize body that omits the run status.
for (
  const [label, body] of [
    ["missing report", { ok: true }],
    ["missing report.run", { ok: true, report: { items_failed: 0 } }],
    ["missing report.run.status", { ok: true, report: { run: {} } }],
  ] as Array<[string, unknown]>
) {
  Deno.test(`finalize 200 ok true with ${label} is FINALIZE_PROTOCOL_ERROR`, async () => {
    const h = harness({ itemCount: 2, finalizeResponder: () => jsonResponse(200, body) });
    const { status, payload } = await run(
      { mode: "dry_run", run_key: `t-proto-${label}`, batch_size: 1 },
      h,
    );
    assertEquals(status, 502);
    assertEquals(payload.ok, false);
    assertEquals(payload.code, "FINALIZE_PROTOCOL_ERROR");
    assertEquals(h.batchCalls.length, 2, "no data batch may be resent");
    assertEquals(h.finalizeCalls.length, 1);
  });
}

Deno.test("finalize 200 ok true with unknown run status is FINALIZE_PROTOCOL_ERROR", async () => {
  const h = harness({
    itemCount: 2,
    finalizeResponder: () =>
      jsonResponse(200, { ok: true, report: { run: { status: "in_progress" } } }),
  });
  const { status, payload } = await run(
    { mode: "dry_run", run_key: "t-proto-unknown", batch_size: 1 },
    h,
  );
  assertEquals(status, 502);
  assertEquals(payload.code, "FINALIZE_PROTOCOL_ERROR");
  assertEquals(h.batchCalls.length, 2, "no data batch may be resent");
});


// 16,22,23 — finalize failures.
for (
  const [label, responder] of [
    ["404", () => jsonResponse(404, { ok: false, code: "RUN_NOT_FOUND" })],
    ["500", () => jsonResponse(500, { ok: false })],
    ["200 with ok:false", () => jsonResponse(200, { ok: false })],
    ["200 with non-JSON body", () => textResponse(200, "not json")],
  ] as Array<[string, () => Response]>
) {
  Deno.test(`finalize ${label} is FINALIZE_FAILED without resending data`, async () => {
    const h = harness({ itemCount: 2, finalizeResponder: responder });
    const { status, payload } = await run(
      { mode: "dry_run", run_key: `t-fin-${label}`, batch_size: 1 },
      h,
    );
    assertEquals(status, 502);
    assertEquals(payload.ok, false);
    assertEquals(payload.code, "FINALIZE_FAILED");
    assertEquals(h.batchCalls.length, 2, "no data batch may be resent");
    assertEquals(h.finalizeCalls.length, 1);
    assertEquals((payload.batches as unknown[]).length, 2);
    assert(String(payload.message).includes("Do not retry the full sender run"));
  });
}

// 17 — finalize transport exception.
Deno.test("finalize transport exception is lifecycle failure with zero data retries", async () => {
  const h = harness({
    itemCount: 2,
    finalizeResponder: () => {
      throw new Error("finalize socket hang up");
    },
  });
  const { status, payload } = await run(
    { mode: "dry_run", run_key: "t-fin-throw", batch_size: 1 },
    h,
  );
  assertEquals(status, 502);
  assertEquals(payload.code, "FINALIZE_FAILED");
  assertEquals(h.batchCalls.length, 2);
  const finalize = payload.finalize as Record<string, unknown>;
  assertEquals(finalize.attempted, true);
  assert(String(finalize.error).includes("finalize socket hang up"));
});
