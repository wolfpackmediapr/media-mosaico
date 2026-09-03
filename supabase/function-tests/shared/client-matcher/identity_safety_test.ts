import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRosterIndex,
  computeProposedClients,
  isUuidSyntax,
  resolveById,
  resolveByName,
} from "../../../functions/_shared/clientMatcher.ts";
import { extractLegacyAiNames } from "../../../functions/_shared/legacyAiNameAdapter.ts";
import { validateAiClientNames } from "../../../functions/_shared/aiClientSchema.ts";
import { METROPISTAS_CLIENT, METROPISTAS_ID, metropistasPolicies } from "./fixtures/metropistas.policy.ts";

const ORPHAN_UUID = "99999999-9999-4999-8999-999999999999";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

const index = buildRosterIndex([METROPISTAS_CLIENT]);

/* ------------------------------ UUID safety ----------------------------- */

Deno.test("model placeholder ids are never valid", () => {
  for (const bad of ["metropistas", "metropistas_uuid", "client_uuid", "", "1234"]) {
    assert(!isUuidSyntax(bad));
    assertEquals(resolveById(index, bad).client, null);
    assertEquals(resolveById(index, bad).reason, "invalid_uuid_syntax");
  }
});

Deno.test("syntactically valid orphan UUID is rejected", () => {
  const r = resolveById(index, ORPHAN_UUID);
  assertEquals(r.client, null);
  assertEquals(r.reason, "uuid_not_in_roster");
});

Deno.test("canonical roster UUID resolves", () => {
  assertEquals(resolveById(index, METROPISTAS_ID).client?.name, "Metropistas");
});

/* --------------------------- collision safety --------------------------- */

Deno.test("duplicate normalized canonical names fail closed", () => {
  const idx = buildRosterIndex([
    { id: METROPISTAS_ID, name: "Metropistas" },
    { id: OTHER_ID, name: "metropistas" },
  ]);
  const r = resolveByName(idx, "Metropistas");
  assertEquals(r.client, null);
  assertEquals(r.reason, "ambiguous_name");
});

Deno.test("same alias on two clients fails closed", () => {
  const idx = buildRosterIndex([
    { id: METROPISTAS_ID, name: "Metropistas", aliases: ["Grupo Vial"] },
    { id: OTHER_ID, name: "Otra Empresa", aliases: ["grupo vial"] },
  ]);
  const r = resolveByName(idx, "Grupo Vial");
  assertEquals(r.client, null);
  assertEquals(r.reason, "ambiguous_alias");
});

Deno.test("alias colliding with another canonical name fails closed", () => {
  const idx = buildRosterIndex([
    { id: METROPISTAS_ID, name: "Metropistas" },
    { id: OTHER_ID, name: "Otra Empresa", aliases: ["Metropistas"] },
  ]);
  const r = resolveByName(idx, "Metropistas");
  assertEquals(r.client, null);
  assertEquals(r.reason, "name_alias_collision");
});

Deno.test("unique alias resolves to its canonical client", () => {
  const r = resolveByName(index, "abertis");
  assertEquals(r.client?.id, METROPISTAS_ID);
  assertEquals(r.via, "alias");
});

/* ------------------------- legacy AI name adapter ----------------------- */

Deno.test("adapter keeps names and ignores ids/relevance/extra fields", () => {
  const out = extractLegacyAiNames([
    { id: "metropistas_uuid", name: "Metropistas", relevance: "alta", foo: 1 },
    { id: ORPHAN_UUID, name: "Metropistas" },
  ]);
  assertEquals(out.names, ["Metropistas"]);
  assertEquals(out.ignoredIdCount, 2);
});

Deno.test("adapter tolerates malformed AI arrays", () => {
  assertEquals(extractLegacyAiNames(null).names, []);
  assertEquals(extractLegacyAiNames({}).names, []);
  assertEquals(extractLegacyAiNames([{ id: ORPHAN_UUID }]).names, []);
});

Deno.test("AI nomination of a known name resolves to the canonical UUID", () => {
  const out = computeProposedClients(index, {
    title: "Nota sin evidencia determinista",
    description: "Texto generico.",
    policies: metropistasPolicies(),
    aiNominatedNames: extractLegacyAiNames([
      { id: "metropistas_uuid", name: "Metropistas", relevance: "alta" },
    ]).names,
  });
  assertEquals(out.clients.length, 1);
  assertEquals(out.clients[0].id, METROPISTAS_ID);
  assertEquals(out.clients[0].match_method, "ai_name_resolved");
  assertEquals(out.clients[0].matched_field, "ai");
  assertEquals(out.clients[0].relevance, "baja");
});

Deno.test("unknown AI company is discarded and counted", () => {
  const out = computeProposedClients(index, {
    title: "Nota",
    description: "Texto.",
    policies: metropistasPolicies(),
    aiNominatedNames: ["Empresa Desconocida SA"],
  });
  assertEquals(out.clients.length, 0);
  assertEquals(out.rejected[0].reason, "unknown_name");
});

Deno.test("duplicate AI nomination yields exactly one canonical result", () => {
  const out = computeProposedClients(index, {
    title: "Nota",
    description: "Texto.",
    policies: metropistasPolicies(),
    aiNominatedNames: ["Metropistas", "metropistas", "METROPISTAS"],
  });
  assertEquals(out.clients.length, 1);
});

/* ---------------------- dormant future AI contract ---------------------- */

Deno.test("future strict schema validates and normalizes nominations", () => {
  const ok = validateAiClientNames({ client_names: ["Metropistas", " metropistas ", "PROMESA"] });
  assertEquals(ok.ok, true);
  assertEquals(ok.names, ["Metropistas", "PROMESA"]);
});

Deno.test("future strict schema rejects malformed payloads", () => {
  assertEquals(validateAiClientNames({ client_names: "Metropistas" }).ok, false);
  assertEquals(validateAiClientNames({ clients: [] }).ok, false);
  assertEquals(validateAiClientNames([]).ok, false);
  assertEquals(validateAiClientNames(null).names, []);
  assertEquals(validateAiClientNames({}).names, []);
  const mixed = validateAiClientNames({ client_names: ["Metropistas", "", 5, "x".repeat(200)] });
  assertEquals(mixed.names, ["Metropistas"]);
  assertEquals(mixed.rejectedCount, 3);
});
