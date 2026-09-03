/**
 * Shadow-mode orchestration + bounded diagnostics — CP5-C4A.3.
 *
 * SAFETY CONTRACT (binding for this phase):
 *   - The legacy authoritative result is ALWAYS what gets persisted.
 *   - `new` mode has NO authoritative code path here. It is fail-closed:
 *     it degrades to legacy persistence plus a diagnostic saying new mode
 *     is not enabled. Activating the new matcher authoritatively requires a
 *     separate reviewed source change, not an environment-variable flip.
 */

import {
  computeProposedClients,
  MATCHER_VERSION,
  type ClientPolicy,
  type ProposedClient,
  type RosterIndex,
} from "./clientMatcher.ts";
import { extractLegacyAiNames } from "./legacyAiNameAdapter.ts";

export type MatcherMode = "legacy" | "shadow" | "new";

/** Missing or invalid values fail closed to `legacy`. */
export function parseMatcherMode(raw: unknown): MatcherMode {
  if (raw === "shadow") return "shadow";
  if (raw === "new") return "new";
  return "legacy";
}

/**
 * Whether the NEW matcher output may be persisted. Hard-coded `false` in
 * C4A.3 for every mode, including `new`.
 */
export function newMatcherIsAuthoritative(_mode: MatcherMode): boolean {
  return false;
}

/** Diagnostics are computed only in shadow mode. */
export function shouldComputeShadow(mode: MatcherMode): boolean {
  return mode === "shadow";
}

/* ------------------------------------------------------------------ *
 * Bounded diagnostics
 * ------------------------------------------------------------------ */

const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 120;

function clampString(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

function clampArray<T>(items: T[]): T[] {
  return items.slice(0, MAX_ARRAY_ITEMS);
}

export interface ShadowDiagnostic {
  event: "digital_client_matcher_shadow";
  matcher_version: string;
  mode: MatcherMode;
  authoritative: "legacy";
  source_id: string | null;
  old_ids: string[];
  old_names: string[];
  proposed_ids: string[];
  proposed_names: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
  rejected_name_count: number;
  rejected_id_count: number;
  rejected_reasons: string[];
  evidence: Array<{
    id: string;
    method: ProposedClient["match_method"];
    field: ProposedClient["matched_field"];
    keywords: string[];
    identity: string[];
  }>;
  note?: string;
}

export interface LegacyClientLike {
  id?: unknown;
  name?: unknown;
  relevance?: unknown;
}

export interface ShadowInput {
  mode: MatcherMode;
  sourceId: string | null;
  title: string;
  description: string;
  index: RosterIndex;
  policies: Map<string, ClientPolicy>;
  /** The authoritative legacy result (never modified here). */
  legacyClients: LegacyClientLike[];
  /** PRE-MERGE raw AI client nominations from the SAME existing AI call. */
  rawLegacyAiClients: unknown;
}

/**
 * Computes the shadow comparison. Pure: it performs no I/O, no AI call and no
 * database access, and it never returns anything meant for persistence.
 */
export function computeShadowDiagnostic(input: ShadowInput): ShadowDiagnostic {
  const adapter = extractLegacyAiNames(input.rawLegacyAiClients);

  const proposal = computeProposedClients(input.index, {
    title: input.title,
    description: input.description,
    policies: input.policies,
    aiNominatedNames: adapter.names,
  });

  const oldIds: string[] = [];
  const oldNames: string[] = [];
  let rejectedIdCount = 0;
  for (const entry of input.legacyClients ?? []) {
    const id = typeof entry?.id === "string" ? entry.id : null;
    if (id && input.index.byId.has(id)) oldIds.push(id);
    else rejectedIdCount++;
    if (typeof entry?.name === "string") oldNames.push(clampString(entry.name));
  }

  const proposedIds = proposal.clients.map((c) => c.id);
  const oldSet = new Set(oldIds);
  const newSet = new Set(proposedIds);

  return {
    event: "digital_client_matcher_shadow",
    matcher_version: MATCHER_VERSION,
    mode: input.mode,
    authoritative: "legacy",
    source_id: input.sourceId,
    old_ids: clampArray(oldIds),
    old_names: clampArray(oldNames),
    proposed_ids: clampArray(proposedIds),
    proposed_names: clampArray(proposal.clients.map((c) => clampString(c.name))),
    added: clampArray(proposedIds.filter((id) => !oldSet.has(id))),
    removed: clampArray(oldIds.filter((id) => !newSet.has(id))),
    unchanged: clampArray(proposedIds.filter((id) => oldSet.has(id))),
    rejected_name_count: proposal.rejected.length + adapter.droppedCount,
    rejected_id_count: rejectedIdCount,
    rejected_reasons: clampArray(
      Array.from(new Set(proposal.rejected.map((r) => r.reason))),
    ),
    evidence: clampArray(
      proposal.clients.map((c) => ({
        id: c.id,
        method: c.match_method,
        field: c.matched_field,
        keywords: clampArray(c.matched_keywords.map(clampString)),
        identity: clampArray(c.matched_identity.map(clampString)),
      })),
    ),
  };
}

/**
 * Single logging entry point. Emits one bounded JSON line. Never logs article
 * bodies, descriptions, prompts, raw AI responses, JWTs or secrets.
 */
export function logShadowDiagnostic(diagnostic: ShadowDiagnostic): void {
  console.log(JSON.stringify(diagnostic));
}

/** Diagnostic emitted when `new` mode is requested but not authorized. */
export function newModeNotEnabledDiagnostic(sourceId: string | null): ShadowDiagnostic {
  return {
    event: "digital_client_matcher_shadow",
    matcher_version: MATCHER_VERSION,
    mode: "new",
    authoritative: "legacy",
    source_id: sourceId,
    old_ids: [],
    old_names: [],
    proposed_ids: [],
    proposed_names: [],
    added: [],
    removed: [],
    unchanged: [],
    rejected_name_count: 0,
    rejected_id_count: 0,
    rejected_reasons: [],
    evidence: [],
    note: "new_mode_not_enabled_persisting_legacy",
  };
}
