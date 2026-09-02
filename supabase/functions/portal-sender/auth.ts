/**
 * Authorization for the internal Publiteca `portal-sender` Edge Function.
 *
 * Two distinct clients are used, mirroring the pattern already used by other
 * internal Publiteca functions:
 *
 *   callerClient — anon key + the caller's `Authorization: Bearer <token>`.
 *                  Used ONLY to verify a normal user's token
 *                  (`getClaims`, with `getUser` as a verification fallback).
 *   adminClient  — service-role key. Used to recognize a cryptographically
 *                  verified `service_role` automation token, and for the
 *                  privileged `has_role` lookup.
 *
 * The bearer token is always VERIFIED server-side — never decoded and trusted,
 * and never string-compared against SUPABASE_SERVICE_ROLE_KEY. The anon client
 * is never used for the privileged RPC. A verified user that fails the
 * administrator check is an authorization denial and never re-enters
 * authentication.
 *
 * Token contents are never logged, echoed, or returned.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_ROLE = "administrator";

/** Caller-token verification surface (anon key + caller Authorization). */
export interface CallerAuthClient {
  auth: {
    getClaims(token: string): Promise<{ data: unknown; error: unknown }>;
    getUser(token: string): Promise<{ data: unknown; error: unknown }>;
  };
}

/** Privileged surface (service-role key). */
export interface AdminClient {
  auth: {
    getClaims(token: string): Promise<{ data: unknown; error: unknown }>;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

/**
 * Not caller-controlled: production `index.ts` calls `authorize(request)`.
 * This optional dependency exists exclusively as an in-process test seam.
 */
export interface AuthorizeDependencies {
  callerClient?: CallerAuthClient;
  adminClient?: AdminClient;
}

export type AuthorizeResult =
  | { ok: true; actor: string }
  | { ok: false; response: Response };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function env(name: string): string | undefined {
  // deno-lint-ignore no-explicit-any
  return (globalThis as any).Deno?.env?.get(name);
}

function forbidden(): AuthorizeResult {
  return { ok: false, response: json({ ok: false, code: "FORBIDDEN" }, 403) };
}

function invalidToken(): AuthorizeResult {
  return { ok: false, response: json({ ok: false, code: "INVALID_TOKEN" }, 401) };
}

/** Read-only internal role lookup via the service-role client. Any error means "not an administrator". */
async function isAdministrator(admin: AdminClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: ADMIN_ROLE,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

/** Returns the verified claim set, or null when verification itself did not succeed. */
async function verifyClaims(
  getClaims: (token: string) => Promise<{ data: unknown; error: unknown }>,
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await getClaims(token);
    const candidate = (data as { claims?: unknown } | null)?.claims;
    if (error || !candidate) return null;
    return candidate as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function authorize(
  request: Request,
  dependencies?: AuthorizeDependencies,
): Promise<AuthorizeResult> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: json({ ok: false, code: "MISSING_AUTHORIZATION" }, 401) };
  }

  let callerClient = dependencies?.callerClient;
  let adminClient = dependencies?.adminClient;

  if (!callerClient || !adminClient) {
    const supabaseUrl = env("SUPABASE_URL");
    const anonKey = env("SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return {
        ok: false,
        response: json({ ok: false, code: "INTERNAL_RUNTIME_NOT_CONFIGURED" }, 500),
      };
    }
    callerClient = callerClient ?? (createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as CallerAuthClient);
    adminClient = adminClient ?? (createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as AdminClient);
  }

  // Step 1 — service-role automation path. This check exists ONLY to recognize a
  // cryptographically verified service_role token. Any other outcome falls
  // through to normal-user verification; non-service-role claims from this check
  // are never used as a user authorization decision.
  const serviceClaims = await verifyClaims((t) => adminClient!.auth.getClaims(t), token);
  if (serviceClaims && serviceClaims["role"] === "service_role") {
    return { ok: true, actor: "service_role" };
  }

  // Step 2 — normal-user verification through the caller (anon + caller token) client.
  const claims = await verifyClaims((t) => callerClient!.auth.getClaims(t), token);
  if (claims) {
    const userId = typeof claims["sub"] === "string" ? (claims["sub"] as string) : "";
    // Verified token: the decision is final here — no getUser() retry.
    if (!userId) return forbidden();
    return (await isAdministrator(adminClient, userId))
      ? { ok: true, actor: `admin:${userId}` }
      : forbidden();
  }

  // Step 3 — user claims VERIFICATION did not succeed: verify with GET /auth/v1/user.
  let userId = "";
  try {
    const { data, error } = await callerClient.auth.getUser(token);
    const user = (data as { user?: { id?: unknown } } | null)?.user;
    if (error || !user || typeof user.id !== "string" || !user.id) {
      return invalidToken();
    }
    userId = user.id;
  } catch {
    return invalidToken();
  }

  return (await isAdministrator(adminClient, userId))
    ? { ok: true, actor: `admin:${userId}` }
    : forbidden();
}
