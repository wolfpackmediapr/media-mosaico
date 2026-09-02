/**
 * Internal Publiteca Edge Function entrypoint: `portal-sender`.
 *
 * Production entrypoint only. All request handling lives in `./handler.ts` so
 * that tests can import `handleRequest` without ever starting a listener.
 *
 * The arrow wrapper is deliberate: `Deno.serve(handleRequest)` would pass
 * Deno's `ServeHandlerInfo` as the second argument, where the handler expects
 * optional test dependencies.
 */

import { handleRequest } from "./handler.ts";

Deno.serve((request) => handleRequest(request));
