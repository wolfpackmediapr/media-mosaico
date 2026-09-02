/**
 * Authorization for the internal Publiteca `portal-sender` Edge Function.
 *
 * The bearer token is always VERIFIED server-side — never decoded and trusted,
 * and never string-compared against SUPABASE_SERVICE_ROLE_KEY. Accepted callers
 * are (a) a verified JWT whose `role` claim is `service_role`, or (b) a verified
 * user token belonging to an internal Publiteca administrator.
 *
 * Verification failure and authorization failure are strictly distinct:
 * `getUser()` is consulted ONLY when claims verification did not succeed
 * (throw / returned error / no claims). A verified claim set that fails the
 * administrator check — or that carries no `sub` — is an authorization denial
 * and must never re-enter authentication.
 *
 * Token contents are never logged, echoed, or returned.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_ROLE = "administrator";

/** The minimal surface `authorize` needs. In-process test seam only. */
export interface AdminAuthClient {
  auth: {
    getClaims(token: string): Promise<{ data: unknown; error: unknown }>;
    getUser(token: string): Promise<{ data: unknown; error: unknown }>;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

/**
 * Not caller-controlled: production `index.ts` calls `authorize(request)`.
 * This optional dependency exists exclusively as an in-process test seam.
 */
export interface AuthorizeDependencies {
  admin?: AdminAuthClient;
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

/** Read-only internal role lookup. Any error is treated as "not an administrator". */
async function isAdministrator(admin: AdminAuthClient, userId: string): Promise<boolean> {
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

export async function authorize(
  request: Request,
  dependencies?: AuthorizeDependencies,
): Promise<AuthorizeResult> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: json({ ok: false, code: "MISSING_AUTHORIZATION" }, 401) };
  }

  let admin = dependencies?.admin;
  if (!admin) {
    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        ok: false,
        response: json({ ok: false, code: "INTERNAL_RUNTIME_NOT_CONFIGURED" }, 500),
      };
    }
    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    }) as unknown as AdminAuthClient;
  }

  // Step 1 — cryptographic verification via the internal Auth server.
  let claims: Record<string, unknown> | null = null;
  try {
    const { data, error } = await admin.auth.getClaims(token);
    const candidate = (data as { claims?: unknown } | null)?.claims;
    if (error || !candidate) throw new Error("claims verification failed");
    claims = candidate as Record<string, unknown>;
  } catch {
    claims = null;
  }

  if (claims) {
    if (claims["role"] === "service_role") {
      return { ok: true, actor: "service_role" };
    }
    const userId = typeof claims["sub"] === "string" ? (claims["sub"] as string) : "";
    // Verified token: the decision is final here — no getUser() retry.
    if (!userId) return forbidden();
    return (await isAdministrator(admin, userId))
      ? { ok: true, actor: `admin:${userId}` }
      : forbidden();
  }

  // Step 2 — claims VERIFICATION did not succeed: verify with GET /auth/v1/user.
  let userId = "";
  try {
    const { data, error } = await admin.auth.getUser(token);
    const user = (data as { user?: { id?: unknown } } | null)?.user;
    if (error || !user || typeof user.id !== "string" || !user.id) {
      return invalidToken();
    }
    userId = user.id;
  } catch {
    return invalidToken();
  }

  return (await isAdministrator(admin, userId))
    ? { ok: true, actor: `admin:${userId}` }
    : forbidden();
}
