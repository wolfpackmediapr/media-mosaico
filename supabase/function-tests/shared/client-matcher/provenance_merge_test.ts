import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRosterIndex,
  computeProposedClients,
} from "../../../functions/_shared/clientMatcher.ts";
import { extractLegacyAiNames } from "../../../functions/_shared/legacyAiNameAdapter.ts";
import {
  METROPISTAS_CLIENT,
  METROPISTAS_ID,
  metropistasPolicies,
} from "./fixtures/metropistas.policy.ts";

const index = buildRosterIndex([METROPISTAS_CLIENT]);
const policies = metropistasPolicies();

Deno.test("keyword only -> match_method keyword", () => {
  const out = computeProposedClients(index, {
    title: "Fallas en AutoExpreso",
    description: "Reportes de usuarios.",
    policies,
  });
  assertEquals(out.clients[0].match_method, "keyword");
});

Deno.test("AI only -> match_method ai_name_resolved, no fabricated keywords", () => {
  const out = computeProposedClients(index, {
    title: "Nota generica",
    description: "Sin evidencia.",
    policies,
    aiNominatedNames: ["Metropistas"],
  });
  assertEquals(out.clients[0].match_method, "ai_name_resolved");
  assertEquals(out.clients[0].matched_keywords, []);
  assertEquals(out.clients[0].matched_identity, []);
});

Deno.test("keyword + AI on the same client -> exactly one object, match_method both", () => {
  const out = computeProposedClients(index, {
    title: "Metropistas amplia AutoExpreso",
    description: "Detalles del plan.",
    policies,
    aiNominatedNames: extractLegacyAiNames([{ id: "metropistas_uuid", name: "Metropistas" }]).names,
  });
  assertEquals(out.clients.length, 1);
  const c = out.clients[0];
  assertEquals(c.id, METROPISTAS_ID);
  assertEquals(c.match_method, "both");
  assert(c.matched_keywords.includes("AutoExpreso"));
  assert(c.matched_identity.includes("Metropistas"));
  assertEquals(c.relevance, "alta");
});

Deno.test("multiple keywords across fields are all recorded once", () => {
  const out = computeProposedClients(index, {
    title: "Tapon en la PR 52",
    description: "AutoExpreso y el Puente Teodoro Moscoso afectados.",
    policies,
  });
  const c = out.clients[0];
  assertEquals(c.matched_field, "both");
  assertEquals(new Set(c.matched_keywords).size, c.matched_keywords.length);
  assert(c.matched_keywords.includes("PR-52"));
  assert(c.matched_keywords.includes("AutoExpreso"));
  assert(c.matched_keywords.includes("Puente Teodoro Moscoso"));
});

Deno.test("deterministic evidence controls relevance over AI nomination", () => {
  const out = computeProposedClients(index, {
    title: "Nota vial",
    description: "Metropistas explico el proyecto.",
    policies,
    aiNominatedNames: ["Metropistas"],
  });
  assertEquals(out.clients[0].relevance, "media");
  assertEquals(out.clients[0].match_method, "both");
});
