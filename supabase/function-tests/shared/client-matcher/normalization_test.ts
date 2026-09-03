import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildTermRegex,
  matchesTerm,
  normalizeForMatch,
} from "../../../functions/_shared/clientMatcher.ts";

Deno.test("normalization: case folding", () => {
  assertEquals(normalizeForMatch("Metropistas"), normalizeForMatch("metropistas"));
});

Deno.test("normalization: accent folding", () => {
  assertEquals(normalizeForMatch("José"), "jose");
  assertEquals(normalizeForMatch("Sánchez"), "sanchez");
  assertEquals(normalizeForMatch("Ferré"), "ferre");
});

Deno.test("normalization: repeated whitespace collapses", () => {
  assertEquals(normalizeForMatch("  Puente   Teodoro \n Moscoso "), "puente teodoro moscoso");
});

Deno.test("normalization: dash variants unify", () => {
  assertEquals(normalizeForMatch("PR–52"), "pr-52");
  assertEquals(normalizeForMatch("PR—52"), "pr-52");
  assertEquals(normalizeForMatch("PR‑52"), "pr-52");
});

Deno.test("normalization does not mutate the original string", () => {
  const original = "José Sánchez";
  normalizeForMatch(original);
  assertEquals(original, "José Sánchez");
});

Deno.test("boundary: punctuation around a keyword still matches", () => {
  const h = normalizeForMatch("La empresa (Metropistas), informó hoy.");
  assert(matchesTerm(h, "Metropistas"));
});

Deno.test("boundary: keyword inside a longer token does not match", () => {
  const h = normalizeForMatch("El proyecto Metropistasx no existe");
  assert(!matchesTerm(h, "Metropistas"));
  assert(!matchesTerm(normalizeForMatch("incapaz de pagar"), "paz"));
});

Deno.test("boundary: multi-word phrase matches across collapsed whitespace", () => {
  const h = normalizeForMatch("cruzar el  Puente   Teodoro  Moscoso hoy");
  assert(matchesTerm(h, "Puente Teodoro Moscoso"));
});

Deno.test("boundary: accented phrase matches unaccented text", () => {
  const h = normalizeForMatch("el expreso jose de diego estuvo cerrado");
  assert(matchesTerm(h, "Expreso José de Diego"));
});

Deno.test("boundary: Unicode lookaround regex compiles under this Deno/V8", () => {
  const re = buildTermRegex("metropistas");
  assert(re instanceof RegExp);
  assert(re.test("hoy metropistas informo"));
  assert(!re.test("metropistasx"));
});
