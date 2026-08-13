# Fix: app crashes on iPhone/iPad Safari ("Can't find variable: Notification")

## What is actually happening

Reproduced against the published site (app.publitecapr.com) in a WebKit/iOS Safari engine: the app renders the error screen "Algo salió mal — Can't find variable: Notification". In Chromium the same URL loads fine. `typeof Notification` is `undefined` in that engine, so this is not a caching or publish problem — the deployed code genuinely throws there.

Root cause, confirmed in both the deployed bundle and the source:

`src/components/notifications/utils/notification-utils.ts`, `requestNotificationPermission()`:

```
if ("Notification" in window && Notification.permission === "default") { ... }
return Promise.resolve(Notification.permission === "granted");   // <-- unguarded
```

When the browser has no Notification API, the guarded branch is skipped and the final `return` reads `Notification.permission` on a variable that does not exist, throwing a ReferenceError. It is called on mount from `src/components/notifications/hooks/use-real-time-subscriptions.ts` (line 31), which runs inside the app shell, so the whole app is replaced by the ErrorBoundary fallback on any browser without the API — every iOS Safari without web push, plus Safari on iPad.

## Fix (four source files)

1. `src/components/notifications/utils/notification-utils.ts`
   - add a shared `hasNotificationApi()` helper: `typeof window !== "undefined" && typeof Notification !== "undefined"`;
   - `requestNotificationPermission()` returns `Promise.resolve(false)` immediately when the API is absent, before any reference to the global `Notification`;
   - `showBrowserNotification()` uses the same helper and returns `false` when unsupported;
   - behaviour on supported browsers is unchanged.
2. `src/components/notifications/hooks/use-real-time-subscriptions.ts` — call the permission request with a `.catch()` on the mount path so a rejection can never bubble into a render crash.
3. `src/hooks/use-real-time-alerts.ts` — replace the `"Notification" in window` guards with `typeof Notification !== "undefined"` so no bare reference is ever evaluated on unsupported browsers.
4. `src/hooks/notifications/use-notification-alerts.ts` — same guard change.

`ErrorBoundary` is not modified. No Supabase, backend, RLS, auth, permission, API, schema or business-logic changes.

## Regression test

Add a unit test for `requestNotificationPermission()` run with the global `Notification` unavailable, asserting it resolves `false` and does not throw, plus a supported-browser case asserting the existing permission behaviour is preserved.

## Verification

- WebKit (iOS Safari engine) at 390px: the login UI renders instead of "Can't find variable: Notification".
- WebKit at ~820px (iPad).
- Chromium regression check, confirming the normal permission flow still runs.
- After publishing, repeat the WebKit check against the live app.publitecapr.com.
- Run the new regression test.

Note: the fix only reaches your phone/tablet after re-publishing, and iOS Safari may need a hard reload to drop the cached bundle.
