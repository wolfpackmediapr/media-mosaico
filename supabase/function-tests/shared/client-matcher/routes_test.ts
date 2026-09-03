import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canonicalizeRouteToken,
  matchesRoute,
  normalizeForMatch,
} from "../../../functions/_shared/clientMatcher.ts";

const h = (s: string) => normalizeForMatch(s);

Deno.test("route canonicalization is representation-independent", () => {
  assertEquals(canonicalizeRouteToken("PR-52"), "pr 52");
  assertEquals(canonicalizeRouteToken("PR 52"), "pr 52");
  assertEquals(canonicalizeRouteToken("PR–52"), "pr 52");
  assertEquals(canonicalizeRouteToken("pr52"), "pr 52");
  assertEquals(canonicalizeRouteToken("carretera"), null);
});

Deno.test("PR-52 keyword matches PR 52 text and vice versa", () => {
  assert(matchesRoute(h("accidente en la PR 52 hoy"), "PR-52"));
  assert(matchesRoute(h("accidente en la PR-52 hoy"), "PR 52"));
  assert(matchesRoute(h("accidente en la PR–52 hoy"), "PR-52"));
});

Deno.test("PR 5 does not match PR 52 / PR 53 / PR 59", () => {
  assert(!matchesRoute(h("tapon en la PR 52"), "PR 5"));
  assert(!matchesRoute(h("tapon en la PR-53"), "PR 5"));
  assert(!matchesRoute(h("tapon en la PR 59"), "PR 5"));
  assert(matchesRoute(h("tapon en la PR-5 hoy"), "PR 5"));
});

Deno.test("PR 22 does not match PR 220 and PR 66 does not match PR 660", () => {
  assert(!matchesRoute(h("obras en la PR 220"), "PR 22"));
  assert(!matchesRoute(h("obras en la PR-660"), "PR 66"));
  assert(matchesRoute(h("obras en la PR 22"), "PR 22"));
  assert(matchesRoute(h("obras en la PR-66"), "PR 66"));
});

Deno.test("PR 5 does not match PR-555", () => {
  assert(!matchesRoute(h("ruta PR-555"), "PR 5"));
});
