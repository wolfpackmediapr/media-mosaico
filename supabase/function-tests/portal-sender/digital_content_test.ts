/**
 * CP5 Phase C3A tests — Digital content mapping and sender request contract.
 *
 * Fully in-process and deterministic: no network, no Portal, no `Deno.serve`.
 * `handleRequest` is imported from `handler.ts`; all readers, authorization and
 * transport are injected test seams.
 */

import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { handleRequest, type HandlerDependencies } from "../../functions/portal-sender/handler.ts";
import {
  buildClientLookup,
  type DigitalRow,
  mapDigitalRow,
  resolveMentions,
} from "../../functions/portal-sender/content/digital.ts";
import {
  CONTENT_PATH,
  DIGITAL_SENTIMENT_SOURCE,
} from "../../functions/portal-sender/content/types.ts";

const PORTAL_URL = "https://portal.example.test";
Deno.env.set("PORTAL_INGEST_URL", PORTAL_URL);
Deno.env.set("PORTAL_INGEST_KEY_ID", "cp3-test-key");
Deno.env.set("PORTAL_INGEST_SECRET", "cp3-test-secret");
Deno.env.set("SUPABASE_URL", "https://internal.example.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "internal-service-role");

const METROPISTAS = "08748447-a701-4be3-80c8-7470526e0975";
const PILOT_ID = "bd4d1c76-228b-4246-a544-cac2e3d44373";
const PILOT_TITLE = "Fitch mantiene la nota a deuda de Metropistas";
const OTHER_CLIENT = "11111111-1111-4111-8111-111111111111";

const lookup = buildClientLookup([
  { id: METROPISTAS, name: "Metropistas", aliases: ["Autopistas Metropolitanas"] },
  { id: OTHER_CLIENT, name: "Departamento de Salud", aliases: null },
]);

function row(overrides: Partial<DigitalRow> = {}): DigitalRow {
  return {
    id: PILOT_ID,
    title: PILOT_TITLE,
    summary: "Resumen",
    description: "Cuerpo del artículo",
    category: "ECONOMIA & NEGOCIOS",
    source: "El Nuevo Día",
    link: "https://example.test/nota",
    image_url: "https://example.test/img.jpg",
    pub_date: "2026-06-21T10:00:00.000Z",
    updated_at: "2026-06-22T08:30:00.000Z",
    sentiment: "neutral",
    sentiment_score: 0.1,
    keywords: ["fitch", "deuda"],
    clients: [{ id: METROPISTAS, name: "Metropistas" }],
    feed_source_id: "22222222-2222-4222-8222-222222222222",
    feed_sources: { name: "El Nuevo Día", platform: "news" },
    ...overrides,
  };
}

/* ------------------------------ mapping ------------------------------ */

Deno.test("maps locked identity, version and effective timestamps", () => {
  const dto = mapDigitalRow(row(), lookup);
  assertEquals(dto.source_type, "digital");
  assertEquals(dto.source_id, PILOT_ID);
  assertEquals(dto.source_updated_at, "2026-06-22T08:30:00.000Z");
  assertEquals(dto.effective_at, "2026-06-21T10:00:00.000Z");
  assertEquals(dto.effective_at_estimated, false);
  assertEquals(dto.source_state, "active");
  assertEquals(dto.title, PILOT_TITLE);
  assertEquals(dto.has_media, true);
});

Deno.test("media_outlet falls back to feed source name", () => {
  const dto = mapDigitalRow(row({ source: null }), lookup);
  assertEquals(dto.media_outlet, "El Nuevo Día");
});

Deno.test("missing title fails mapping deterministically", () => {
  assertThrows(() => mapDigitalRow(row({ title: "  " }), lookup), Error, "title is required");
});

Deno.test("missing updated_at fails mapping deterministically", () => {
  assertThrows(() => mapDigitalRow(row({ updated_at: null }), lookup), Error, "updated_at");
});

Deno.test("missing pub_date fails mapping deterministically", () => {
  assertThrows(() => mapDigitalRow(row({ pub_date: null }), lookup), Error, "pub_date");
});

Deno.test("malformed source identity fails mapping", () => {
  assertThrows(() => mapDigitalRow(row({ id: "metropistas_uuid" }), lookup), Error, "UUID");
});

Deno.test("invalid article_url and image_url are omitted", () => {
  const dto = mapDigitalRow(row({ link: "not a url", image_url: "javascript:alert(1)" }), lookup);
  assertEquals(dto.article_url, undefined);
  assertEquals(dto.image_url, undefined);
  assertEquals(dto.has_media, false);
});

Deno.test("unsupported optional fields are never fabricated", () => {
  const dto = mapDigitalRow(row(), lookup) as Record<string, unknown>;
  for (const field of ["program_or_section", "page_number", "media_kind", "author", "duration_seconds", "language"]) {
    assertEquals(dto[field], undefined);
  }
});

Deno.test("serialization is deterministic", () => {
  assertEquals(
    JSON.stringify(mapDigitalRow(row(), lookup)),
    JSON.stringify(mapDigitalRow(row(), lookup)),
  );
});

/* ------------------------------ sentiment ------------------------------ */

Deno.test("valid English sentiment maps with the deterministic source constant", () => {
  const dto = mapDigitalRow(row({ sentiment: " Negative " }), lookup);
  assertEquals(dto.sentiment, "negative");
  assertEquals(dto.sentiment_source, DIGITAL_SENTIMENT_SOURCE);
});

Deno.test("Spanish sentiment maps", () => {
  assertEquals(mapDigitalRow(row({ sentiment: "positivo" }), lookup).sentiment, "positive");
  assertEquals(mapDigitalRow(row({ sentiment: "mixto" }), lookup).sentiment, "mixed");
});

Deno.test("unknown sentiment is omitted and preserved raw in metadata", () => {
  const dto = mapDigitalRow(row({ sentiment: "muy bueno" }), lookup);
  assertEquals(dto.sentiment, undefined);
  assertEquals(dto.sentiment_source, undefined);
  assertEquals(dto.metadata?.internal_sentiment_raw, "muy bueno");
});

Deno.test("out-of-range sentiment_score is omitted, never clamped", () => {
  const dto = mapDigitalRow(row({ sentiment_score: 7 }), lookup);
  assertEquals(dto.sentiment_score, undefined);
  assertEquals(dto.metadata?.internal_sentiment_score_omitted, "7");
});

Deno.test("non-finite sentiment_score is omitted", () => {
  assertEquals(mapDigitalRow(row({ sentiment_score: "abc" }), lookup).sentiment_score, undefined);
});

/* ------------------------------ mentions ------------------------------ */

Deno.test("valid canonical stored UUID is accepted", () => {
  const r = resolveMentions([{ id: METROPISTAS, name: "Metropistas" }], lookup);
  assertEquals(r.mentions, [{ raw_client_id: METROPISTAS, raw_client_name: "Metropistas" }]);
});

Deno.test("placeholder non-UUID id is ignored and name resolves", () => {
  const r = resolveMentions([{ id: "metropistas_uuid", name: "Metropistas" }], lookup);
  assertEquals(r.mentions, [{ raw_client_id: METROPISTAS, raw_client_name: "Metropistas" }]);
});

Deno.test("orphan UUID is ignored", () => {
  const r = resolveMentions(
    [{ id: "99999999-9999-4999-8999-999999999999", name: "Cliente Desconocido" }],
    lookup,
  );
  assertEquals(r.mentions, [{ raw_client_name: "Cliente Desconocido" }]);
  assertEquals(r.resolved_canonical, 0);
});

Deno.test("alias resolves exactly, no fuzzy matching", () => {
  assertEquals(
    resolveMentions(["Autopistas Metropolitanas"], lookup).mentions[0]?.raw_client_id,
    METROPISTAS,
  );
  assertEquals(
    resolveMentions(["Autopistas Metropolitanas de PR"], lookup).mentions[0],
    { raw_client_name: "Autopistas Metropolitanas de PR" },
  );
});

Deno.test("unresolved name is emitted without a UUID", () => {
  const r = resolveMentions([{ name: "Empresa X" }], lookup);
  assertEquals(r.mentions, [{ raw_client_name: "Empresa X" }]);
  assertEquals(r.unresolved_names, 1);
});

Deno.test("duplicate client identities merge to one mention", () => {
  const r = resolveMentions(
    [
      { id: METROPISTAS, name: "Metropistas" },
      { id: "metropistas_uuid", name: "metropistas" },
      "Autopistas Metropolitanas",
    ],
    lookup,
  );
  assertEquals(r.mentions.length, 1);
  assertEquals(r.total_identities, 3);
  assertEquals(r.resolved_canonical, 1);
});

Deno.test("full authoritative mention set is emitted", () => {
  const dto = mapDigitalRow(
    row({
      clients: [
        { id: METROPISTAS, name: "Metropistas" },
        { id: "salud_uuid", name: "Departamento de Salud" },
        { name: "Empresa X" },
      ],
    }),
    lookup,
  );
  assertEquals(dto.mentions.length, 3);
  assertEquals(dto.mentions.filter((m) => m.raw_client_id).length, 2);
});

Deno.test("mentions carry no relevance, score or sentiment enrichment", () => {
  const dto = mapDigitalRow(row(), lookup);
  for (const mention of dto.mentions as Record<string, unknown>[]) {
    assertEquals(mention.relevance, undefined);
    assertEquals(mention.relevance_score, undefined);
    assertEquals(mention.sentiment, undefined);
    assertEquals(mention.matched_keywords, undefined);
  }
});

/* --------------------- request contract / selector --------------------- */

function deps(overrides: Partial<HandlerDependencies> = {}): HandlerDependencies {
  return {
    authorizeImpl: () => Promise.resolve({ ok: true, actor: "test" } as never),
    fetchImpl: (input) => {
      calls.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
    finalizeImpl: () =>
      Promise.resolve({
        status: 200,
        batch_id: "finalize",
        response: { ok: true, report: { run: { status: "completed" } } },
      } as never),
    fetchDigitalImpl: () => Promise.resolve({ items: [mapDigitalRow(row(), lookup)] }),
    ...overrides,
  };
}

let calls: string[] = [];

function post(body: unknown): Request {
  return new Request("https://internal.example.test/portal-sender", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("kind=content/media=digital posts to the content ingest path", async () => {
  calls = [];
  const response = await handleRequest(post({ kind: "content", media: "digital" }), deps());
  const payload = await response.json();
  assertEquals(response.status, 200);
  assertEquals(payload.kind, "content");
  assertEquals(payload.media, "digital");
  assert(calls[0]!.endsWith(CONTENT_PATH));
});

Deno.test("kind absent keeps legacy clients behavior", async () => {
  calls = [];
  const response = await handleRequest(
    post({}),
    deps({ fetchClientsImpl: () => Promise.resolve([]) }),
  );
  const payload = await response.json();
  assertEquals(payload.kind, "clients");
  assertEquals(payload.media, undefined);
  assertEquals(calls.length, 0);
});

Deno.test("contradictory request combinations are rejected", async () => {
  const cases: Array<[unknown, string]> = [
    [{ kind: "clients", media: "digital" }, "MEDIA_NOT_ALLOWED_FOR_CLIENTS"],
    [{ kind: "clients", source_ids: [PILOT_ID] }, "SOURCE_IDS_NOT_ALLOWED_FOR_CLIENTS"],
    [{ kind: "content" }, "MEDIA_REQUIRED"],
    [{ kind: "content", media: "radio" }, "UNSUPPORTED_MEDIA"],
    [{ kind: "content", media: "tv" }, "UNSUPPORTED_MEDIA"],
    [{ kind: "content", media: "digital", source_ids: ["not-a-uuid"] }, "INVALID_SOURCE_ID"],
    [{ kind: "content", media: "digital", batch_size: 500 }, "BATCH_SIZE_TOO_LARGE"],
  ];
  for (const [body, code] of cases) {
    const response = await handleRequest(post(body), deps());
    const payload = await response.json();
    assertEquals(response.status, 400, code);
    assertEquals(payload.code, code);
  }
});

Deno.test("source_ids are deduplicated and passed through the Digital selector", async () => {
  let received: string[] | undefined;
  await handleRequest(
    post({ kind: "content", media: "digital", source_ids: [PILOT_ID, PILOT_ID] }),
    deps({
      fetchDigitalImpl: (params) => {
        received = params.sourceIds;
        return Promise.resolve({
          items: [mapDigitalRow(row(), lookup)],
          source_id_report: [{ source_id: PILOT_ID, disposition: "found_digital" }],
        });
      },
    }),
  );
  assertEquals(received, [PILOT_ID]);
});

Deno.test("non-Digital and missing source ids surface an observable diagnostic", async () => {
  const twitterId = "33333333-3333-4333-8333-333333333333";
  const missingId = "44444444-4444-4444-8444-444444444444";
  const response = await handleRequest(
    post({ kind: "content", media: "digital", source_ids: [PILOT_ID, twitterId, missingId] }),
    deps({
      fetchDigitalImpl: () =>
        Promise.resolve({
          items: [mapDigitalRow(row(), lookup)],
          source_id_report: [
            { source_id: PILOT_ID, disposition: "found_digital" },
            { source_id: twitterId, disposition: "rejected_non_digital" },
            { source_id: missingId, disposition: "not_found" },
          ],
        }),
    }),
  );
  const payload = await response.json();
  assertEquals(payload.source_id_report.length, 3);
  assertEquals(payload.source_id_report[1].disposition, "rejected_non_digital");
  assertEquals(payload.total_items, 1);
});

Deno.test("pilot row maps to the expected canonical identity", () => {
  const dto = mapDigitalRow(row(), lookup);
  assertEquals(dto.source_id, PILOT_ID);
  assertEquals(dto.title, PILOT_TITLE);
  assertEquals(dto.mentions[0]?.raw_client_id, METROPISTAS);
});
