import { assertEquals } from "jsr:@std/assert@1";
import { authorize, type AdminAuthClient } from "./auth.ts";
import { verifyTestVector, buildCanonicalRequest, TEST_VECTOR, sha256Hex } from "./signing.ts";

interface StubOptions {
  claims?: Record<string, unknown> | null;
  claimsError?: boolean;
  claimsThrows?: boolean;
  user?: { id: string } | null;
  userError?: boolean;
  userThrows?: boolean;
  hasRole?: boolean;
}

function stub(options: StubOptions) {
  const calls = { getClaims: 0, getUser: 0, rpc: 0 };
  const admin: AdminAuthClient = {
    auth: {
      getClaims(_token: string) {
        calls.getClaims++;
        if (options.claimsThrows) throw new Error("verification threw");
        if (options.claimsError || !options.claims) {
          return Promise.resolve({ data: null, error: { message: "invalid" } });
        }
        return Promise.resolve({ data: { claims: options.claims }, error: null });
      },
      getUser(_token: string) {
        calls.getUser++;
        if (options.userThrows) throw new Error("getUser threw");
        if (options.userError || !options.user) {
          return Promise.resolve({ data: { user: null }, error: { message: "invalid" } });
        }
        return Promise.resolve({ data: { user: options.user }, error: null });
      },
    },
    rpc(fn: string, args: Record<string, unknown>) {
      calls.rpc++;
      assertEquals(fn, "has_role");
      assertEquals(args["_role"], "administrator");
      return Promise.resolve({ data: options.hasRole === true, error: null });
    },
  };
  return { admin, calls };
}

const req = (header?: string) =>
  new Request("https://internal.example/portal-sender", {
    method: "POST",
    headers: header ? { authorization: header } : {},
  });

async function code(response: Response): Promise<string> {
  const body = (await response.json()) as { code?: string };
  return body.code ?? "";
}

// 1
Deno.test("1 missing Bearer -> 401 MISSING_AUTHORIZATION", async () => {
  const { admin, calls } = stub({});
  const result = await authorize(req(), { admin });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  assertEquals(await code(result.response), "MISSING_AUTHORIZATION");
  assertEquals(calls, { getClaims: 0, getUser: 0, rpc: 0 });
});

// 2 — getClaims returns { error }
Deno.test("2 getClaims returns error + getUser fails -> 401 INVALID_TOKEN", async () => {
  const { admin, calls } = stub({ claimsError: true, userError: true });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  assertEquals(await code(result.response), "INVALID_TOKEN");
  assertEquals(calls.getUser, 1);
  assertEquals(calls.rpc, 0);
});

// 3
Deno.test("3 verified service_role -> allowed, no getUser/rpc", async () => {
  const { admin, calls } = stub({ claims: { role: "service_role" } });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "service_role");
  assertEquals(calls.getUser, 0);
  assertEquals(calls.rpc, 0);
});

// 4
Deno.test("4 verified getClaims administrator -> allowed", async () => {
  const { admin, calls } = stub({
    claims: { role: "authenticated", sub: "11111111-1111-4111-8111-111111111111" },
    hasRole: true,
  });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "admin:11111111-1111-4111-8111-111111111111");
  assertEquals(calls.getUser, 0);
  assertEquals(calls.rpc, 1);
});

// 5 — getClaims throws
Deno.test("5 getClaims throws + getUser administrator -> allowed", async () => {
  const { admin, calls } = stub({
    claimsThrows: true,
    user: { id: "22222222-2222-4222-8222-222222222222" },
    hasRole: true,
  });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "admin:22222222-2222-4222-8222-222222222222");
  assertEquals(calls.getUser, 1);
  assertEquals(calls.rpc, 1);
});

// 6
Deno.test("6 getClaims failure + getUser non-admin -> 403 FORBIDDEN", async () => {
  const { admin, calls } = stub({
    claimsError: true,
    user: { id: "33333333-3333-4333-8333-333333333333" },
    hasRole: false,
  });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 403);
  assertEquals(await code(result.response), "FORBIDDEN");
  assertEquals(calls.getUser, 1);
  assertEquals(calls.rpc, 1);
});

// 7 — getClaims throws, getUser throws
Deno.test("7 getClaims throws + getUser failure -> 401 INVALID_TOKEN", async () => {
  const { admin, calls } = stub({ claimsThrows: true, userThrows: true });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  assertEquals(await code(result.response), "INVALID_TOKEN");
  assertEquals(calls.getUser, 1);
  assertEquals(calls.rpc, 0);
});

// 8
Deno.test("8 verified getClaims non-admin -> 403 and getUser NOT called", async () => {
  const { admin, calls } = stub({
    claims: { role: "authenticated", sub: "44444444-4444-4444-8444-444444444444" },
    hasRole: false,
  });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 403);
  assertEquals(await code(result.response), "FORBIDDEN");
  assertEquals(calls.getUser, 0);
  assertEquals(calls.rpc, 1);
});

// 9
Deno.test("9 verified claims with no sub -> 403 and getUser NOT called", async () => {
  const { admin, calls } = stub({ claims: { role: "authenticated" } });
  const result = await authorize(req("Bearer x"), { admin });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 403);
  assertEquals(await code(result.response), "FORBIDDEN");
  assertEquals(calls.getUser, 0);
  assertEquals(calls.rpc, 0);
});

// Signing regressions (unchanged behavior).
Deno.test("regression: protocol test vector still matches", async () => {
  const vector = await verifyTestVector();
  assertEquals(vector.ok, true);
  assertEquals(vector.bodySha256, TEST_VECTOR.expectedBodySha256);
  assertEquals(vector.signature, TEST_VECTOR.expectedSignature);
});

Deno.test("regression: canonical request is the eight-line form", async () => {
  const bodyHash = await sha256Hex(TEST_VECTOR.body);
  const canonical = buildCanonicalRequest({
    method: TEST_VECTOR.method,
    path: TEST_VECTOR.path,
    query: TEST_VECTOR.canonicalQuery,
    schemaVersion: TEST_VECTOR.schemaVersion,
    keyId: TEST_VECTOR.keyId,
    timestamp: TEST_VECTOR.timestamp,
    batchId: TEST_VECTOR.batchId,
    bodyHash,
  });
  assertEquals(canonical.split("\n").length, 8);
  assertEquals(
    canonical,
    [
      "POST",
      "/api/public/ingest/clients",
      "",
      "1",
      "cp3-test-key",
      "2026-01-01T00:00:00.000Z",
      "cp3-test-batch-0001",
      TEST_VECTOR.expectedBodySha256,
    ].join("\n"),
  );
});
