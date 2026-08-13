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

## Fix

1. `notification-utils.ts` — make both helpers fully API-safe:
   - add a single `hasNotificationApi()` check using `typeof window !== "undefined" && typeof Notification !== "undefined"`;
   - `requestNotificationPermission()` returns `Promise.resolve(false)` when the API is absent, and never touches `Notification.permission` outside the guard;
   - keep the existing behaviour unchanged on browsers that do support it.
2. Apply the same `typeof Notification !== "undefined"` guard style in the two other places that use bare `Notification` — `src/hooks/use-real-time-alerts.ts` and `src/hooks/notifications/use-notification-alerts.ts`. They are currently guarded by `"Notification" in window`, which is correct but inconsistent; making it uniform prevents this class of bug returning.
3. `use-real-time-subscriptions.ts` — wrap the permission request in a `.catch()` so a rejected permission promise can never bubble into a render crash.
4. `ErrorBoundary` — no behaviour change requested, but note that it currently swallows the error without a console trace; leaving it as is.

No backend, auth, RLS, permissions, API or business-logic files are touched. Only the three notification files above.

## Verification

- Re-run the WebKit (iOS Safari engine) load of the app and confirm it reaches the login screen instead of the error card, at 390px and 820px viewports.
- Re-check Chromium to confirm no regression.
- Then publish, and re-verify the live URL in WebKit.

Note: the fix only takes effect on your phone/tablet after re-publishing, and iOS Safari may need a hard reload to drop the cached bundle.
