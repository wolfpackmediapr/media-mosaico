/**
 * Portal ingest signing — internal Publiteca sender.
 *
 * Implements the approved eight-line canonical request. This file holds no
 * credentials; the secret is passed in by the caller from the internal Edge
 * Function environment and is never logged or returned.
 */

export const INGEST_HEADERS = {
  keyId: "x-portal-key-id",
  timestamp: "x-portal-timestamp",
  batchId: "x-portal-batch-id",
  schemaVersion: "x-portal-schema-version",
  signature: "x-portal-signature",
} as const;

export const SCHEMA_VERSION = 1;
export const SCHEMA_VERSION_HEADER = "1";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(digest);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

/** RFC3986 percent-encoding (encodeURIComponent leaves !'()* unescaped). */
function rfc3986(input: string): string {
  return encodeURIComponent(input).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Canonical query: parameters sorted by name then value, `key=value` pairs
 * RFC3986-encoded and joined with `&`. Empty string when there is no query —
 * the canonical request still emits its newline position.
 */
export function canonicalQueryFromUrl(url: URL): string {
  const parts: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => parts.push([key, value]));
  parts.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return parts.map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`).join("&");
}

export interface CanonicalRequestInput {
  method: string;
  path: string;
  query: string;
  schemaVersion: string;
  keyId: string;
  timestamp: string;
  batchId: string;
  bodyHash: string;
}

/**
 * METHOD \n PATH \n CANONICAL_QUERY \n SCHEMA_VERSION \n KEY_ID \n
 * TIMESTAMP \n BATCH_ID \n SHA256_HEX(raw_body)
 */
export function buildCanonicalRequest(input: CanonicalRequestInput): string {
  return [
    input.method.toUpperCase(),
    input.path,
    input.query,
    input.schemaVersion,
    input.keyId,
    input.timestamp,
    input.batchId,
    input.bodyHash,
  ].join("\n");
}

export interface SignedRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  /** The EXACT bytes that were hashed and signed. Never re-serialize. */
  body: string;
  canonical: string;
  bodyHash: string;
}

/**
 * Signs one request. `bodyString` must already be the final body: it is hashed,
 * bound into the signature, and returned unchanged for transmission.
 */
export async function signRequest(params: {
  baseUrl: string;
  path: string;
  keyId: string;
  secret: string;
  timestamp: string;
  batchId: string;
  bodyString: string;
  schemaVersion?: string;
  /** Test-mode only: sign this path instead of the one actually requested. */
  signPathOverride?: string;
  /** Test-mode only: sign this canonical query instead of the real one. */
  signQueryOverride?: string;
}): Promise<SignedRequest> {
  const url = new URL(params.path, params.baseUrl);
  const schemaVersion = params.schemaVersion ?? SCHEMA_VERSION_HEADER;
  const bodyHash = await sha256Hex(params.bodyString);

  const canonical = buildCanonicalRequest({
    method: "POST",
    path: params.signPathOverride ?? url.pathname,
    query: params.signQueryOverride ?? canonicalQueryFromUrl(url),
    schemaVersion,
    keyId: params.keyId,
    timestamp: params.timestamp,
    batchId: params.batchId,
    bodyHash,
  });

  const signature = await hmacHex(params.secret, canonical);

  return {
    url: url.toString(),
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      [INGEST_HEADERS.keyId]: params.keyId,
      [INGEST_HEADERS.timestamp]: params.timestamp,
      [INGEST_HEADERS.batchId]: params.batchId,
      [INGEST_HEADERS.schemaVersion]: schemaVersion,
      [INGEST_HEADERS.signature]: signature,
    },
    body: params.bodyString,
    canonical,
    bodyHash,
  };
}

/**
 * Deterministic protocol test vector. Portal and sender canonicalization can be
 * compared byte-for-byte against these fixed values.
 *
 * canonical string (escaped):
 * "POST\n/api/public/ingest/clients\n\n1\ncp3-test-key\n2026-01-01T00:00:00.000Z\ncp3-test-batch-0001\n8186db5934089cc5f9b5ea99115c0dca52510c041562b8815ded864281fbbf8d"
 */
export const TEST_VECTOR = {
  secret: "cp3-test-secret",
  method: "POST",
  path: "/api/public/ingest/clients",
  canonicalQuery: "",
  schemaVersion: "1",
  keyId: "cp3-test-key",
  timestamp: "2026-01-01T00:00:00.000Z",
  batchId: "cp3-test-batch-0001",
  body:
    '{"schema_version":1,"run_key":"cp3-test-run","batch_id":"cp3-test-batch-0001","sequence_no":0,"mode":"dry_run","request_timestamp":"2026-01-01T00:00:00.000Z","items":[{"client_id":"00000000-0000-4000-8000-000000000001","name":"Cliente Ejemplo","is_active":true,"source_updated_at":"2025-12-31T23:59:59.000Z","source_state":"active"}]}',
  bodyByteLength: 334,
  expectedBodySha256: "8186db5934089cc5f9b5ea99115c0dca52510c041562b8815ded864281fbbf8d",
  expectedSignature: "dc3a190faf6ef3f662482401b622cd04e11b36aeacfc918999618f59a2d8d6ed",
} as const;

/** Recomputes the test vector; returns pass/fail plus the computed values. */
export async function verifyTestVector(): Promise<{
  ok: boolean;
  bodySha256: string;
  signature: string;
  canonical: string;
}> {
  const bodySha256 = await sha256Hex(TEST_VECTOR.body);
  const canonical = buildCanonicalRequest({
    method: TEST_VECTOR.method,
    path: TEST_VECTOR.path,
    query: TEST_VECTOR.canonicalQuery,
    schemaVersion: TEST_VECTOR.schemaVersion,
    keyId: TEST_VECTOR.keyId,
    timestamp: TEST_VECTOR.timestamp,
    batchId: TEST_VECTOR.batchId,
    bodyHash: bodySha256,
  });
  const signature = await hmacHex(TEST_VECTOR.secret, canonical);
  return {
    ok:
      bodySha256 === TEST_VECTOR.expectedBodySha256 &&
      signature === TEST_VECTOR.expectedSignature,
    bodySha256,
    signature,
    canonical,
  };
}
