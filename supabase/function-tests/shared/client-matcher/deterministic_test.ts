import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRosterIndex,
  computeProposedClients,
} from "../../../functions/_shared/clientMatcher.ts";
import {
  METROPISTAS_CLIENT,
  METROPISTAS_ID,
  metropistasPolicies,
} from "./fixtures/metropistas.policy.ts";

const index = buildRosterIndex([METROPISTAS_CLIENT]);
const policies = metropistasPolicies();

const run = (title: string, description: string) =>
  computeProposedClients(index, { title, description, policies });

/* ---------------- false positives under the PROPOSED policy -------------- */

Deno.test("generic carretera article does not match Metropistas", () => {
  const out = run("Cierran carretera por derrumbe", "La carretera estara cerrada dos dias.");
  assertEquals(out.clients.length, 0);
});

Deno.test("generic autopista article does not match Metropistas", () => {
  const out = run("Accidente en la autopista", "Una autopista del area metropolitana.");
  assertEquals(out.clients.length, 0);
});

Deno.test("generic peaje article does not match Metropistas", () => {
  const out = run("Debate sobre el peaje", "El peaje sera evaluado por la agencia.");
  assertEquals(out.clients.length, 0);
});

Deno.test("generic CESCO article does not match Metropistas", () => {
  const out = run("CESCO amplia horarios", "El CESCO de Bayamon abrira los sabados.");
  assertEquals(out.clients.length, 0);
});

/* ------------------------------- positives ------------------------------- */

Deno.test("exact brand in title -> alta, identity provenance", () => {
  const out = run("Metropistas anuncia inversion", "La empresa detallo su plan.");
  assertEquals(out.clients.length, 1);
  const c = out.clients[0];
  assertEquals(c.id, METROPISTAS_ID);
  assertEquals(c.relevance, "alta");
  assertEquals(c.match_method, "keyword");
  assertEquals(c.matched_field, "title");
  assert(c.matched_identity.includes("Metropistas"));
});

Deno.test("brand only in description -> media", () => {
  const out = run("Nueva inversion vial", "El proyecto es operado por Metropistas.");
  assertEquals(out.clients[0].relevance, "media");
  assertEquals(out.clients[0].matched_field, "description");
});

Deno.test("AutoExpreso article matches with keyword provenance", () => {
  const out = run("Fallas en AutoExpreso", "Usuarios reportan cargos duplicados.");
  assertEquals(out.clients.length, 1);
  assert(out.clients[0].matched_keywords.includes("AutoExpreso"));
});

Deno.test("Puente Teodoro Moscoso article matches", () => {
  const out = run("Cierre parcial", "El Puente Teodoro Moscoso tendra mantenimiento.");
  assertEquals(out.clients.length, 1);
  assert(out.clients[0].matched_keywords.includes("Puente Teodoro Moscoso"));
});

Deno.test("PR-52 and PR 52 articles match via route evidence", () => {
  for (const text of ["Tapon en la PR-52", "Tapon en la PR 52"]) {
    const out = run(text, "Reportan congestion.");
    assertEquals(out.clients.length, 1);
    assert(out.clients[0].matched_keywords.includes("PR-52"));
    assertEquals(out.clients[0].relevance, "alta");
  }
});

Deno.test("alias Abertis resolves as identity evidence", () => {
  const out = run("Abertis reporta resultados", "La matriz publico su informe.");
  assertEquals(out.clients.length, 1);
  assert(out.clients[0].matched_identity.includes("Abertis"));
});

Deno.test("matched_keywords contains only terms that actually matched", () => {
  const out = run("Metropistas y AutoExpreso", "Sin otros temas.");
  const c = out.clients[0];
  assertEquals(c.matched_keywords, ["AutoExpreso"]);
  assert(!c.matched_keywords.includes("Tarifas de peajes"));
});

Deno.test("title + description evidence yields matched_field=both", () => {
  const out = run("Metropistas informa", "Metropistas amplio el servicio.");
  assertEquals(out.clients[0].matched_field, "both");
});
