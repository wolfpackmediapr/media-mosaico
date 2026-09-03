import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeShadowDiagnostic,
  logShadowDiagnostic,
  newMatcherIsAuthoritative,
  newModeNotEnabledDiagnostic,
  parseMatcherMode,
  shouldComputeShadow,
} from "../../../functions/_shared/shadowMatcher.ts";
import { buildRosterIndex } from "../../../functions/_shared/clientMatcher.ts";
import {
  METROPISTAS_CLIENT,
  METROPISTAS_ID,
  metropistasPolicies,
} from "./fixtures/metropistas.policy.ts";

const index = buildRosterIndex([METROPISTAS_CLIENT]);
const policies = metropistasPolicies();

/**
 * Deterministic stand-in for the production integration wrapper. It mirrors
 * exactly what process-rss-feed / reanalyze-articles do: the legacy analysis
 * result is what gets persisted, in every mode.
 */
function integrationWrapper(rawMode: unknown, legacyAnalysisClients: unknown[]) {
  const mode = parseMatcherMode(rawMode);
  let diagnostic = null;
  if (shouldComputeShadow(mode)) {
    diagnostic = computeShadowDiagnostic({
      mode,
      sourceId: "row-1",
      title: "Cierran carretera por derrumbe",
      description: "La carretera estara cerrada.",
      index,
      policies,
      legacyClients: legacyAnalysisClients as never[],
      // Legacy AI produced no nominations for this article.
      rawLegacyAiClients: [],
    });
  } else if (mode === "new") {
    diagnostic = newModeNotEnabledDiagnostic("row-1");
  }
  return { persistedClients: legacyAnalysisClients, diagnostic, mode };
}

const LEGACY_BASELINE = [
  { id: METROPISTAS_ID, name: "Metropistas", relevance: "baja" },
];

Deno.test("mode parsing fails closed", () => {
  assertEquals(parseMatcherMode(undefined), "legacy");
  assertEquals(parseMatcherMode(""), "legacy");
  assertEquals(parseMatcherMode("NEW"), "legacy");
  assertEquals(parseMatcherMode("bogus"), "legacy");
  assertEquals(parseMatcherMode("legacy"), "legacy");
  assertEquals(parseMatcherMode("shadow"), "shadow");
  assertEquals(parseMatcherMode("new"), "new");
});

Deno.test("new matcher is never authoritative in C4A.3", () => {
  for (const mode of ["legacy", "shadow", "new"] as const) {
    assertEquals(newMatcherIsAuthoritative(mode), false);
  }
});

Deno.test("legacy mode persists the legacy baseline and computes no shadow", () => {
  const r = integrationWrapper(undefined, LEGACY_BASELINE);
  assertEquals(r.persistedClients, LEGACY_BASELINE);
  assertEquals(r.diagnostic, null);
});

Deno.test("shadow mode persists exactly the legacy baseline", () => {
  const r = integrationWrapper("shadow", LEGACY_BASELINE);
  assertEquals(r.persistedClients, LEGACY_BASELINE);
  assert(r.diagnostic !== null);
  assertEquals(r.diagnostic!.authoritative, "legacy");
});

Deno.test("shadow proposal differing from legacy still cannot alter persistence", () => {
  const r = integrationWrapper("shadow", LEGACY_BASELINE);
  // Proposed set is empty (generic "carretera" is removed by policy) while the
  // legacy baseline contains Metropistas: they genuinely differ.
  assertEquals(r.diagnostic!.proposed_ids, []);
  assertEquals(r.diagnostic!.removed, [METROPISTAS_ID]);
  assertEquals(r.persistedClients, LEGACY_BASELINE);
});

Deno.test("invalid mode value persists the legacy baseline", () => {
  const r = integrationWrapper("NEW-MATCHER-PLEASE", LEGACY_BASELINE);
  assertEquals(r.mode, "legacy");
  assertEquals(r.persistedClients, LEGACY_BASELINE);
  assertEquals(r.diagnostic, null);
});

Deno.test("DIGITAL_CLIENT_MATCHER_MODE=new does not persist new matcher results", () => {
  const r = integrationWrapper("new", LEGACY_BASELINE);
  assertEquals(r.persistedClients, LEGACY_BASELINE);
  assertEquals(r.diagnostic!.note, "new_mode_not_enabled_persisting_legacy");
  assertEquals(r.diagnostic!.proposed_ids, []);
  assertEquals(r.diagnostic!.authoritative, "legacy");
});

Deno.test("diagnostic counts legacy invalid ids and is bounded/safe", () => {
  const d = computeShadowDiagnostic({
    mode: "shadow",
    sourceId: "row-2",
    title: "Metropistas anuncia inversion",
    description: "Detalles del proyecto.",
    index,
    policies,
    legacyClients: [
      { id: "metropistas_uuid", name: "Metropistas", relevance: "alta" },
      { id: METROPISTAS_ID, name: "Metropistas", relevance: "alta" },
    ],
    rawLegacyAiClients: [{ id: "metropistas_uuid", name: "Metropistas", relevance: "alta" }],
  });
  assertEquals(d.rejected_id_count, 1);
  assertEquals(d.proposed_ids, [METROPISTAS_ID]);
  assertEquals(d.unchanged, [METROPISTAS_ID]);
  const serialized = JSON.stringify(d);
  assert(!serialized.includes("Detalles del proyecto"));
  assert(serialized.length < 2000);
  logShadowDiagnostic(d);
});
