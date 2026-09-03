/**
 * Shared, GENERIC Digital client matcher (CP5-C4A.3).
 *
 * This module contains NO client-specific rules. Every policy decision
 * (which keywords are active, which route tokens apply, which terms were
 * removed) is supplied by the caller through `ClientPolicy`.
 *
 * In C4A.3 this module is SHADOW/PROPOSED logic only: nothing here is
 * authoritative and nothing here writes to the database.
 */

export const MATCHER_VERSION = "c4a3-shadow-1";

/* ------------------------------------------------------------------ *
 * 1. Normalization contract
 * ------------------------------------------------------------------ */

/**
 * Normalization used ONLY for matching. Original journalism text is never
 * mutated.
 *
 * Steps, in order:
 *   1. NFD decomposition
 *   2. strip combining marks (accent folding)  -> "José" == "jose"
 *   3. lowercase
 *   4. unify dash variants (– — ‑ −) to "-"
 *   5. collapse all whitespace runs to a single space
 *   6. trim
 */
export function normalizeForMatch(input: string): string {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ *
 * 2. Term boundary contract
 * ------------------------------------------------------------------ */

/**
 * Boundary strategy: explicit Unicode lookarounds, never JavaScript `\b`
 * (which is ASCII-word based and misbehaves around Spanish text).
 *
 * A term matches only when the character immediately before and immediately
 * after the match is NOT a Unicode Letter or Number. Interior whitespace in a
 * multi-word phrase is matched flexibly because normalization already
 * collapsed whitespace runs.
 */
export function buildTermRegex(normalizedTerm: string): RegExp {
  const body = normalizedTerm
    .split(" ")
    .filter((p) => p.length > 0)
    .map(escapeRegex)
    .join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "u");
}

/** True when `term` occurs in `normalizedHaystack` under the boundary contract. */
export function matchesTerm(normalizedHaystack: string, term: string): boolean {
  const normalizedTerm = normalizeForMatch(term);
  if (!normalizedHaystack || !normalizedTerm) return false;
  return buildTermRegex(normalizedTerm).test(normalizedHaystack);
}

/* ------------------------------------------------------------------ *
 * 3. Route identifier contract
 * ------------------------------------------------------------------ */

const ROUTE_RE = /^pr ?(\d{1,3})$/;

/**
 * Canonicalizes a PR route identifier to the token `pr <number>`.
 * "PR-52", "PR 52", "PR–52", "pr52" all canonicalize to "pr 52".
 * Returns null when the input is not a route identifier.
 */
export function canonicalizeRouteToken(input: string): string | null {
  const normalized = normalizeForMatch(input)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = ROUTE_RE.exec(normalized);
  if (!m) return null;
  return `pr ${m[1]}`;
}

/**
 * Route matching is deliberately separate from ordinary keyword matching.
 * The route number is bounded by Unicode letter/number lookarounds so `PR 5`
 * can never match `PR 52`, `PR 53`, `PR 59`, and `PR 22` can never match
 * `PR 220`.
 */
export function matchesRoute(normalizedHaystack: string, routeInput: string): boolean {
  const token = canonicalizeRouteToken(routeInput);
  if (!token || !normalizedHaystack) return false;
  const num = token.slice(3);
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])pr ?-? ?${num}(?![\\p{L}\\p{N}])`,
    "u",
  );
  return re.test(normalizedHaystack);
}

/* ------------------------------------------------------------------ *
 * 4. Canonical roster + collision-safe resolution
 * ------------------------------------------------------------------ */

export interface RosterClient {
  id: string;
  name: string;
  aliases?: string[] | null;
  keywords?: string[] | null;
}

export type RejectReason =
  | "invalid_uuid_syntax"
  | "uuid_not_in_roster"
  | "unknown_name"
  | "ambiguous_name"
  | "ambiguous_alias"
  | "name_alias_collision"
  | "empty_name";

export interface RosterIndex {
  byId: Map<string, RosterClient>;
  /** normalized canonical name -> client ids (multi-map, collision aware) */
  byName: Map<string, string[]>;
  /** normalized alias -> client ids (multi-map, collision aware) */
  byAlias: Map<string, string[]>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidSyntax(value: unknown): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function buildRosterIndex(clients: RosterClient[]): RosterIndex {
  const byId = new Map<string, RosterClient>();
  const byName = new Map<string, string[]>();
  const byAlias = new Map<string, string[]>();

  for (const client of clients) {
    if (!client?.id) continue;
    byId.set(client.id, client);

    const n = normalizeForMatch(client.name ?? "");
    if (n) {
      const list = byName.get(n) ?? [];
      if (!list.includes(client.id)) list.push(client.id);
      byName.set(n, list);
    }
    for (const alias of client.aliases ?? []) {
      const a = normalizeForMatch(alias ?? "");
      if (!a) continue;
      const list = byAlias.get(a) ?? [];
      if (!list.includes(client.id)) list.push(client.id);
      byAlias.set(a, list);
    }
  }

  return { byId, byName, byAlias };
}

export interface Resolution {
  client: RosterClient | null;
  reason?: RejectReason;
  /** How the identity was established when resolved. */
  via?: "uuid" | "name" | "alias";
}

/** Exact UUID validation: valid syntax AND present in the active roster. */
export function resolveById(index: RosterIndex, id: unknown): Resolution {
  if (!isUuidSyntax(id)) return { client: null, reason: "invalid_uuid_syntax" };
  const client = index.byId.get(String(id).trim());
  if (!client) return { client: null, reason: "uuid_not_in_roster" };
  return { client, via: "uuid" };
}

/**
 * Fail-closed name/alias resolution.
 *
 * - canonical name unique                -> resolve
 * - canonical name duplicated            -> ambiguous_name
 * - alias unique                         -> resolve
 * - alias duplicated                     -> ambiguous_alias
 * - name of client A AND alias of client B -> name_alias_collision
 *
 * No arbitrary winner is ever selected.
 */
export function resolveByName(index: RosterIndex, rawName: unknown): Resolution {
  if (typeof rawName !== "string") return { client: null, reason: "empty_name" };
  const key = normalizeForMatch(rawName);
  if (!key) return { client: null, reason: "empty_name" };

  const nameIds = index.byName.get(key) ?? [];
  const aliasIds = index.byAlias.get(key) ?? [];

  const union = Array.from(new Set([...nameIds, ...aliasIds]));
  if (nameIds.length > 0 && aliasIds.length > 0 && union.length > 1) {
    return { client: null, reason: "name_alias_collision" };
  }
  if (nameIds.length > 1) return { client: null, reason: "ambiguous_name" };
  if (nameIds.length === 1) {
    return { client: index.byId.get(nameIds[0]) ?? null, via: "name" };
  }
  if (aliasIds.length > 1) return { client: null, reason: "ambiguous_alias" };
  if (aliasIds.length === 1) {
    return { client: index.byId.get(aliasIds[0]) ?? null, via: "alias" };
  }
  return { client: null, reason: "unknown_name" };
}

/* ------------------------------------------------------------------ *
 * 5. Deterministic matching
 * ------------------------------------------------------------------ */

/** Explicit, caller-supplied policy. The matcher never hard-codes a client. */
export interface ClientPolicy {
  /** Ordinary configured keywords/phrases that remain active. */
  keywords?: string[];
  /** Route identifiers handled by the route matcher (e.g. "PR-52"). */
  routes?: string[];
  /** Terms explicitly removed by policy; never matched even if configured. */
  removed?: string[];
  /** Extra legitimate aliases treated as identity evidence. */
  aliases?: string[];
}

export type EvidenceKind = "identity_name" | "identity_alias" | "keyword" | "route";
export type MatchedField = "title" | "description" | "both" | "ai";

export interface Evidence {
  kind: EvidenceKind;
  /** The configured term as written in policy/roster (not normalized). */
  term: string;
  field: "title" | "description" | "both";
}

function fieldOf(inTitle: boolean, inDescription: boolean): "title" | "description" | "both" {
  if (inTitle && inDescription) return "both";
  return inTitle ? "title" : "description";
}

/**
 * Deterministic evidence for a single client under an explicit policy.
 * Canonical name and aliases are first-class identity evidence and are never
 * conflated with ordinary configured keywords.
 */
export function matchClientDeterministic(
  client: RosterClient,
  policy: ClientPolicy,
  title: string,
  description: string,
): Evidence[] {
  const nTitle = normalizeForMatch(title);
  const nDesc = normalizeForMatch(description);
  const removed = new Set((policy.removed ?? []).map(normalizeForMatch));
  const evidence: Evidence[] = [];

  const consider = (term: string, kind: EvidenceKind) => {
    const norm = normalizeForMatch(term);
    if (!norm || removed.has(norm)) return;
    const inTitle = kind === "route" ? matchesRoute(nTitle, term) : matchesTerm(nTitle, term);
    const inDesc = kind === "route" ? matchesRoute(nDesc, term) : matchesTerm(nDesc, term);
    if (!inTitle && !inDesc) return;
    if (evidence.some((e) => e.kind === kind && normalizeForMatch(e.term) === norm)) return;
    evidence.push({ kind, term, field: fieldOf(inTitle, inDesc) });
  };

  consider(client.name, "identity_name");
  for (const alias of [...(client.aliases ?? []), ...(policy.aliases ?? [])]) {
    consider(alias, "identity_alias");
  }
  for (const keyword of policy.keywords ?? []) consider(keyword, "keyword");
  for (const route of policy.routes ?? []) consider(route, "route");

  return evidence;
}

/* ------------------------------------------------------------------ *
 * 6. Relevance (PROPOSED / NOT ACTIVE)
 * ------------------------------------------------------------------ */

export type Relevance = "alta" | "media" | "baja";

/**
 * PROPOSED / NOT ACTIVE relevance matrix. Never derived from keyword count.
 *
 *   identity/route/keyword evidence in title       -> alta
 *   evidence only in description                   -> media
 *   AI-name-resolved with no deterministic evidence -> baja
 */
export function proposeRelevance(evidence: Evidence[]): Relevance {
  if (evidence.length === 0) return "baja";
  const inTitle = evidence.some((e) => e.field === "title" || e.field === "both");
  return inTitle ? "alta" : "media";
}

/* ------------------------------------------------------------------ *
 * 7. Provenance-bearing proposed object + merge
 * ------------------------------------------------------------------ */

export interface ProposedClient {
  id: string;
  name: string;
  relevance: Relevance;
  match_method: "keyword" | "ai_name_resolved" | "both";
  /** ONLY terms that actually matched the normalized source text. */
  matched_keywords: string[];
  matched_field: MatchedField;
  /** Truthful identity provenance, kept separate from matched_keywords. */
  matched_identity: string[];
}

function mergeField(evidence: Evidence[]): MatchedField {
  const hasTitle = evidence.some((e) => e.field === "title" || e.field === "both");
  const hasDesc = evidence.some((e) => e.field === "description" || e.field === "both");
  if (hasTitle && hasDesc) return "both";
  if (hasTitle) return "title";
  if (hasDesc) return "description";
  return "ai";
}

export interface MatchInput {
  title: string;
  description: string;
  /** Per-client explicit policy, keyed by canonical client id. */
  policies: Map<string, ClientPolicy>;
  /** Canonical names nominated by AI (ids/relevance already discarded). */
  aiNominatedNames?: string[];
}

export interface MatchOutput {
  clients: ProposedClient[];
  rejected: Array<{ value: string; reason: RejectReason }>;
}

/**
 * Full proposed match: deterministic evidence merged with AI name-resolved
 * nominations. Canonical UUID is the dedupe key, so a client can only ever
 * appear once; deterministic evidence always controls relevance.
 */
export function computeProposedClients(
  index: RosterIndex,
  input: MatchInput,
): MatchOutput {
  const byClient = new Map<string, { client: RosterClient; evidence: Evidence[]; ai: boolean }>();
  const rejected: Array<{ value: string; reason: RejectReason }> = [];

  for (const client of index.byId.values()) {
    const policy = input.policies.get(client.id) ?? {};
    const evidence = matchClientDeterministic(client, policy, input.title, input.description);
    if (evidence.length > 0) byClient.set(client.id, { client, evidence, ai: false });
  }

  const seenNominations = new Set<string>();
  for (const nomination of input.aiNominatedNames ?? []) {
    const key = normalizeForMatch(nomination);
    if (!key || seenNominations.has(key)) continue;
    seenNominations.add(key);
    const resolution = resolveByName(index, nomination);
    if (!resolution.client) {
      rejected.push({ value: nomination, reason: resolution.reason ?? "unknown_name" });
      continue;
    }
    const existing = byClient.get(resolution.client.id);
    if (existing) existing.ai = true;
    else byClient.set(resolution.client.id, { client: resolution.client, evidence: [], ai: true });
  }

  const clients: ProposedClient[] = Array.from(byClient.values()).map(
    ({ client, evidence, ai }) => {
      const deterministic = evidence.length > 0;
      return {
        id: client.id,
        name: client.name,
        relevance: proposeRelevance(evidence),
        match_method: deterministic && ai ? "both" : deterministic ? "keyword" : "ai_name_resolved",
        matched_keywords: evidence
          .filter((e) => e.kind === "keyword" || e.kind === "route")
          .map((e) => e.term),
        matched_identity: evidence
          .filter((e) => e.kind === "identity_name" || e.kind === "identity_alias")
          .map((e) => e.term),
        matched_field: deterministic ? mergeField(evidence) : "ai",
      };
    },
  );

  return { clients, rejected };
}

/* ------------------------------------------------------------------ *
 * 8. Policy construction from the live roster (no client-specific rules)
 * ------------------------------------------------------------------ */

/**
 * Builds per-client policies straight from the configured roster data.
 * Keywords that canonicalize as PR route identifiers are routed to the route
 * matcher; everything else stays an ordinary keyword. No term is removed here
 * — proposed removals live only in test/simulation fixtures until a keyword
 * configuration change is separately reviewed.
 */
export function buildPoliciesFromRoster(
  clients: RosterClient[],
): Map<string, ClientPolicy> {
  const policies = new Map<string, ClientPolicy>();
  for (const client of clients) {
    if (!client?.id) continue;
    const keywords: string[] = [];
    const routes: string[] = [];
    for (const keyword of client.keywords ?? []) {
      if (typeof keyword !== "string" || !keyword.trim()) continue;
      if (canonicalizeRouteToken(keyword)) routes.push(keyword);
      else keywords.push(keyword);
    }
    policies.set(client.id, { keywords, routes });
  }
  return policies;
}
