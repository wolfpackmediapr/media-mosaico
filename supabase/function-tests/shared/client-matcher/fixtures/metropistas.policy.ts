/**
 * PROPOSED / NOT APPLIED TO PRODUCTION — CP5-C4A.3.
 *
 * Test/simulation fixture ONLY. `public.clients.keywords` is NOT modified by
 * this phase, and the shared matcher contains no client-specific logic: this
 * policy is supplied to it as explicit data.
 */

import type { ClientPolicy, RosterClient } from "../../../../functions/_shared/clientMatcher.ts";

export const METROPISTAS_ID = "11111111-1111-4111-8111-111111111111";

export const METROPISTAS_CLIENT: RosterClient = {
  id: METROPISTAS_ID,
  name: "Metropistas",
  aliases: ["Abertis"],
};

/** PROPOSED removals — generic terms that produced the false positives. */
export const PROPOSED_REMOVED = [
  "carretera",
  "autopista",
  "Autopistas",
  "peaje",
  "CESCO",
];

/** PROPOSED keep-list. */
export const PROPOSED_KEYWORDS = [
  "Metropistas",
  "Abertis",
  "AutoExpreso",
  "Puente Teodoro Moscoso",
  "Tarifas de peajes",
  "Aumento de peajes",
  "Expreso José de Diego",
  "expreso Martínez Nadal",
  "Autopista Luis A. Ferré",
  "Autopista Roberto Sánchez Vilella",
  "Carril dinámico",
  "Cogestión vehicular",
  "Accidentes en autopistas",
  "Asistencia en la carretera",
];

export const PROPOSED_ROUTES = ["PR-5", "PR-20", "PR-22", "PR-52", "PR-53", "PR-66"];

export const METROPISTAS_POLICY: ClientPolicy = {
  keywords: PROPOSED_KEYWORDS,
  routes: PROPOSED_ROUTES,
  removed: PROPOSED_REMOVED,
};

export function metropistasPolicies(): Map<string, ClientPolicy> {
  return new Map([[METROPISTAS_ID, METROPISTAS_POLICY]]);
}
