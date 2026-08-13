# Mobile Refactor — Correction Pass

The external review is accurate on all points. Each item below was re-verified against the codebase before writing this plan.

## What is wrong today

- `e2e/responsive.spec.ts` tests `/ajustes/medios`, which is not a configured route. The real one is `/ajustes/general/medios`.
- `/admin` is a real protected route and is missing from the matrix.
- Only 4 Settings routes are covered; General, Prensa, Radio, TV, Participantes and Instituciones are absent.
- The protected spec asserts overflow plus two shell checks. The interaction coverage described in the last status report does not exist in code.
- `src/components/ui/tabs.tsx` was modified globally, which the approved plan explicitly ruled out ("Do not change the shared Tabs primitive globally").
- `SettingsMobileNav` matches only subsection paths, so `/ajustes/clientes`, `/ajustes/radio`, `/ajustes/tv` and other section roots render an empty Select.
- The mobile Header has the hamburger and page title but not the Publimedia logo the approved P1 called for.

## Corrections

1. **Route matrix.** Replace `/ajustes/medios` with `/ajustes/general/medios`. Add `/admin`. Add one representative route per Settings family: `/ajustes/general/medios`, `/ajustes/usuarios/administradores`, `/ajustes/clientes/gestion`, `/ajustes/prensa/fuentes`, `/ajustes/radio/programas`, `/ajustes/tv/canales`, `/ajustes/participantes/gestion`, `/ajustes/instituciones/gestion`. Leave `/ajustes/clientes/permisos` out — it has no configured route and is pre-existing, out of scope.

2. **Interaction suite** in a new `e2e/interactions.spec.ts`, mobile viewports only, running under the authenticated project:
   - drawer: hamburger opens the Sheet, a nav item navigates, drawer closes;
   - tabs: a Publiteca tab strip scrolls horizontally and a trigger off the initial viewport can be tapped;
   - filters: a filter Select opens and its content fits inside the viewport;
   - dialog: open a dialog, assert it fits the viewport width, scrolls vertically when tall, and closes;
   - media controls: TV and Radio player controls are visible and tappable at 390px.

3. **Revert the global Tabs primitive.** Restore `TabsList` / `TabsTrigger` to their original classes and move the scroll behavior to the consumer tab strips that need it (Publiteca pages, `PressTabsContainer`, `MonitoringTabs`, `NotificationTabs`, settings tab bars), matching the approved P2 wording. This removes an untested global change from the release.

4. **SettingsMobileNav.** Fall back to the matching section root when no subsection matches, so the Select always shows the current section. Add section roots as selectable options.

5. **Mobile Header logo.** Add the Publimedia logo next to the hamburger, `md:hidden`, sized so the title still truncates cleanly at 320px.

6. **Verification honesty.** Authenticated routes stay marked BLOCKED until `E2E_EMAIL` / `E2E_PASSWORD` exist. No route is reported as passing on the basis of code review. The final deliverable is an exact route x viewport x interaction matrix with a per-cell status of PASS, FAIL or BLOCKED.

## Technical notes

Files touched: `e2e/responsive.spec.ts`, new `e2e/interactions.spec.ts`, `src/components/ui/tabs.tsx` (revert), the tab-strip consumers listed above, `src/components/settings/SettingsMobileNav.tsx`, `src/components/layout/Header.tsx`. No backend, auth, RLS or data changes. The Dialog primitive change stays as-is and gets covered by the new dialog interaction test rather than being reverted.

To unblock authenticated verification, a dedicated administrator E2E account is needed with its credentials supplied as `E2E_EMAIL` and `E2E_PASSWORD` secrets.

## Restricted-user E2E profile (future/optional)

Keep the administrator profile as the driver of the full protected route matrix. Additionally document a second, optional Playwright profile for a restricted `data_entry` account holding only a subset of `user_section_permissions`. When its credentials exist, it verifies that the desktop Sidebar and the mobile drawer expose exactly the same authorized section list, and that Publiteca media tabs honor the same restrictions.

This profile is documented and scaffolded only. It does not block the correction pass, and permission-specific verification is reported as BLOCKED until `E2E_RESTRICTED_EMAIL` / `E2E_RESTRICTED_PASSWORD` are provided.

## Final deliverable

A report containing: exact files changed; route x viewport matrix; interaction matrix; admin-auth E2E status; restricted-permission E2E status; confirmation that `src/components/ui/tabs.tsx` is back to its pre-refactor behavior; and confirmation that no `supabase/`, auth, RLS, permission, API or business-logic files were touched.
