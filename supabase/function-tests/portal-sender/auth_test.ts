import { assertEquals } from "jsr:@std/assert@1";
import { authorize, type AdminClient, type CallerAuthClient } from "../../functions/portal-sender/auth.ts";
import { verifyTestVector, buildCanonicalRequest, TEST_VECTOR, sha256Hex } from "../../functions/portal-sender/signing.ts";

interface StubOptions {
  /** Claims returned by adminClient.auth.getClaims (service-role recognition only). */
  serviceClaims?: Record<string, unknown> | null;
  serviceClaimsThrows?: boolean;
  /** Claims returned by callerClient.auth.getClaims (normal-user verification). */
  claims?: Record<string, unknown> | null;
  claimsError?: boolean;
  claimsThrows?: boolean;
  user?: { id: string } | null;
  userError?: boolean;
  userThrows?: boolean;
  hasRole?: boolean;
}

function stub(options: StubOptions) {
  const calls = {
    callerGetClaims: 0,
    callerGetUser: 0,
    adminGetClaims: 0,
    adminRpc: 0,
  };

  const callerClient: CallerAuthClient = {
    auth: {
      getClaims(_token: string) {
        calls.callerGetClaims++;
        if (options.claimsThrows) throw new Error("verification threw");
        if (options.claimsError || !options.claims) {
          return Promise.resolve({ data: null, error: { message: "invalid" } });
        }
        return Promise.resolve({ data: { claims: options.claims }, error: null });
      },
      getUser(_token: string) {
        calls.callerGetUser++;
        if (options.userThrows) throw new Error("getUser threw");
        if (options.userError || !options.user) {
          return Promise.resolve({ data: { user: null }, error: { message: "invalid" } });
        }
        return Promise.resolve({ data: { user: options.user }, error: null });
      },
    },
  };

  const adminClient: AdminClient = {
    auth: {
      getClaims(_token: string) {
        calls.adminGetClaims++;
        if (options.serviceClaimsThrows) throw new Error("service verification threw");
        if (!options.serviceClaims) {
          return Promise.resolve({ data: null, error: { message: "invalid" } });
        }
        return Promise.resolve({ data: { claims: options.serviceClaims }, error: null });
      },
    },
    rpc(fn: string, args: Record<string, unknown>) {
      calls.adminRpc++;
      assertEquals(fn, "has_role");
      assertEquals(args["_role"], "administrator");
      return Promise.resolve({ data: options.hasRole === true, error: null });
    },
  };

  return { callerClient, adminClient, calls };
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
  const { callerClient, adminClient, calls } = stub({});
  const result = await authorize(req(), { callerClient, adminClient });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  assertEquals(await code(result.response), "MISSING_AUTHORIZATION");
  assertEquals(calls, { callerGetClaims: 0, callerGetUser: 0, adminGetClaims: 0, adminRpc: 0 });
});

// 2 — caller getClaims returns { error }
Deno.test("2 caller getClaims error + getUser fails -> 401 INVALID_TOKEN", async () => {
  const { callerClient, adminClient, calls } = stub({ claimsError: true, userError: true });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  assertEquals(await code(result.response), "INVALID_TOKEN");
  assertEquals(calls.callerGetClaims, 1);
  assertEquals(calls.callerGetUser, 1);
  assertEquals(calls.adminRpc, 0);
});

// 3 — service-role recognized through adminClient.auth.getClaims
Deno.test("3 verified service_role via adminClient -> allowed, no caller calls, no rpc", async () => {
  const { callerClient, adminClient, calls } = stub({ serviceClaims: { role: "service_role" } });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "service_role");
  assertEquals(calls.adminGetClaims, 1);
  assertEquals(calls.callerGetClaims, 0);
  assertEquals(calls.callerGetUser, 0);
  assertEquals(calls.adminRpc, 0);
});

// 4
Deno.test("4 verified caller getClaims administrator -> allowed via adminClient.rpc", async () => {
  const { callerClient, adminClient, calls } = stub({
    claims: { role: "authenticated", sub: "11111111-1111-4111-8111-111111111111" },
    hasRole: true,
  });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "admin:11111111-1111-4111-8111-111111111111");
  assertEquals(calls.callerGetClaims, 1);
  assertEquals(calls.callerGetUser, 0);
  assertEquals(calls.adminRpc, 1);
});

// 5 — caller getClaims throws
Deno.test("5 caller getClaims throws + getUser administrator -> allowed", async () => {
  const { callerClient, adminClient, calls } = stub({
    claimsThrows: true,
    user: { id: "22222222-2222-4222-8222-222222222222" },
    hasRole: true,
  });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "admin:22222222-2222-4222-8222-222222222222");
  assertEquals(calls.callerGetUser, 1);
  assertEquals(calls.adminRpc, 1);
});

// 6
Deno.test("6 caller getClaims failure + getUser non-admin -> 403 FORBIDDEN", async () => {
  const { callerClient, adminClient, calls } = stub({
    claimsError: true,
    user: { id: "33333333-3333-4333-8333-333333333333" },
    hasRole: false,
  });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 403);
  assertEquals(await code(result.response), "FORBIDDEN");
  assertEquals(calls.callerGetUser, 1);
  assertEquals(calls.adminRpc, 1);
});

// 7 — both user verification mechanisms fail
Deno.test("7 caller getClaims throws + getUser throws -> 401 INVALID_TOKEN", async () => {
  const { callerClient, adminClient, calls } = stub({ claimsThrows: true, userThrows: true });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  assertEquals(await code(result.response), "INVALID_TOKEN");
  assertEquals(calls.callerGetUser, 1);
  assertEquals(calls.adminRpc, 0);
});

// 8
Deno.test("8 verified caller getClaims non-admin -> 403 and getUser NOT called", async () => {
  const { callerClient, adminClient, calls } = stub({
    claims: { role: "authenticated", sub: "44444444-4444-4444-8444-444444444444" },
    hasRole: false,
  });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 403);
  assertEquals(await code(result.response), "FORBIDDEN");
  assertEquals(calls.callerGetUser, 0);
  assertEquals(calls.adminRpc, 1);
});

// 9
Deno.test("9 verified caller claims with no sub -> 403 and getUser NOT called", async () => {
  const { callerClient, adminClient, calls } = stub({ claims: { role: "authenticated" } });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 403);
  assertEquals(await code(result.response), "FORBIDDEN");
  assertEquals(calls.callerGetUser, 0);
  assertEquals(calls.adminRpc, 0);
});

// 10 — admin-client claim check that is not service_role must not decide the user path
Deno.test("10 admin getClaims returns non-service_role -> falls through to caller verification", async () => {
  const { callerClient, adminClient, calls } = stub({
    serviceClaims: { role: "authenticated", sub: "55555555-5555-4555-8555-555555555555" },
    claims: { role: "authenticated", sub: "66666666-6666-4666-8666-666666666666" },
    hasRole: true,
  });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  // The user id comes from the CALLER-verified claims, not the admin-client check.
  assertEquals(result.actor, "admin:66666666-6666-4666-8666-666666666666");
  assertEquals(calls.adminGetClaims, 1);
  assertEquals(calls.callerGetClaims, 1);
  assertEquals(calls.adminRpc, 1);
});

// 11 — admin getClaims throwing must not reject the request
Deno.test("11 admin getClaims throws -> normal user path still runs", async () => {
  const { callerClient, adminClient, calls } = stub({
    serviceClaimsThrows: true,
    claims: { role: "authenticated", sub: "77777777-7777-4777-8777-777777777777" },
    hasRole: true,
  });
  const result = await authorize(req("Bearer x"), { callerClient, adminClient });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.actor, "admin:77777777-7777-4777-8777-777777777777");
  assertEquals(calls.adminGetClaims, 1);
  assertEquals(calls.callerGetClaims, 1);
  assertEquals(calls.adminRpc, 1);
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
