# Publiteca — Full Mobile Compatibility Refactor (verified plan)

Scope: presentation-only responsive refactor. No changes under `supabase/`, no schema/RLS/RPC/Edge Function/auth/permission/business-logic changes. Desktop must stay visually equivalent.

## Verification of the proposed scope against the actual code

Confirmed by reading the repo:
- `Layout.tsx` uses `flex flex-col md:flex-row` and renders `Sidebar` inline — the sidebar does stack above content below `md`. `Header.tsx` has no hamburger. `src/components/ui/sheet.tsx` exists, so the drawer needs no new dependency.
- Tailwind `container` has global `padding: "2rem"` — confirmed. Affected: `MediaMonitoring.tsx` (`container mx-auto py-8`), `TvMainContent.tsx` (`container mx-auto p-6`, two places), `PublicLayout.tsx`, `Footer.tsx`.
- `PressTabsContainer.tsx` line 43: `grid w-full md:w-[500px] grid-cols-3` — confirmed.
- `SettingsNav.tsx` is a vertical `TabsList` (`flex h-auto w-full flex-col`) inside `SettingsLayout`'s `lg:w-1/5` aside — it does stack the whole settings tree above content below `lg`.
- `w-[80%]` confirmed in four Prensa tables: `SourcesTable`, `RatesTable`, `GenresTable`, `SectionsTable` (under `src/pages/configuracion/press/components/`).
- Base `Table` already wraps in `relative w-full overflow-auto` — contained scroll fallback exists, as the document assumes.
- `DialogContent` is `w-full max-w-lg ... p-6` with no mobile gutter — at 320px it touches both edges.
- Notification popover: the fixed `w-80` is **not** in `src/components/notifications/NotificationPopover.tsx`; it is in `src/components/ui/notification/notification-popover.tsx` line 86, an absolutely positioned `right-0 mt-2 w-80` panel (not Radix). Fix belongs there.
- `TvVideoControls.tsx` is a single `flex items-center gap-4` row with play/pause, `min-w-[40px]` timestamps, progress and volume — confirmed as a phone-width risk.
- `playwright.config.ts` + `playwright-fixture.ts` exist, but there is **no `e2e/` folder yet** — responsive tests will create it.

Adjustments to the proposed document:
1. Notification popover path corrected as above.
2. Phase 5 should not touch Tailwind's `container` config; local `px-3 sm:px-6` overrides only (as the document itself prefers).
3. Phase 7 "Publiteca data tables" and "CategoriesTable" need discovery during implementation; exact filenames differ per module.
4. Backend/data check: nothing in this scope requires reading or changing Supabase. Permission behavior stays sourced from `useSectionPermissions()` and `user_profiles`/`user_section_permissions` — the mobile drawer will reuse the exact same filtered menu array from `Sidebar.tsx`, not a copy.

## Execution phases

**P1 — Shell (blocker).** `Layout.tsx` holds drawer state and stops stacking; `Sidebar.tsx` becomes `hidden md:flex` for desktop plus an exported `Sheet` drawer variant reusing the same `mainMenuItems`/`bottomMenuItems`, `userRole` and `canAccess` filtering and active-route logic; `Header.tsx` gains a `md:hidden` hamburger (44px) plus the logo. Drawer closes on navigation. No remount of TV/Radio trees — layout-level CSS only.

**P2 — Publiteca + section tabs.** `PublitecaLayout.tsx` (inline `gridTemplateColumns`), `pages/publiteca/{Prensa,Radio,Tv,RedesSociales}.tsx`, `PressTabsContainer.tsx`, `MonitoringTabs`, `NotificationTabs`, settings tab bars: convert to scrollable flex strips (`overflow-x-auto`, `shrink-0`, hidden scrollbar). Do not change the shared `Tabs` primitive globally.

**P3 — Settings nav.** Below `lg`, replace the vertical tree with a compact selector (scrollable section strip or Select) while keeping `SettingsNav` untouched at `lg+`. URLs and hierarchy unchanged; no route repairs.

**P4 — Padding.** Local `p-4 sm:p-6` / `px-3 sm:px-8` overrides on the confirmed `container` consumers. No Tailwind config change.

**P5 — Filters/toolbars.** `DateRangeFilter`, `AlertsDateRangePicker`, `PrensaSearch`, `ProcessingJobsTable` filters, `ClientFilter`, `MediaFilter`, `ParticipanteFilter`, `TvRatesFilter`, TV rates import, `ClientFilterDropdown`: parent `flex flex-wrap gap-2`, controls `w-full sm:w-[<desktop width>]`.

**P6 — Tables.** Per-table A/B/C/D priority pass with `hidden md:table-cell` / `hidden lg:table-cell` applied to head+cell pairs; actions always reachable; remove the four `w-[80%]` widths and audit 250px/120px fixed columns. Sticky action cells kept only where they don't eat a 320px viewport.

**P7 — Dialogs/forms.** Local override pattern `w-[calc(100vw-2rem)] sm:w-full` plus `max-h-[calc(100dvh-2rem)] overflow-y-auto` on the tall forms (clients/taxonomy, categories, participantes, TV/Radio channel-program-station, rate imports, notification preferences, monitoring targets, alert details). Global `DialogContent` gets a gutter only if the local pass proves it safe for desktop.

**P8 — Media controls.** `TvVideoControls`: wrap to two rows below `sm` (transport+progress, then volume) keeping every prop/callback. Radio player/seek/speed/upload verified at 320px with persistence intact.

**P9 — Floating UI.** Fix `ui/notification/notification-popover.tsx` `w-80` → viewport-aware with `sm:w-80`; audit `PopoverContent` (`w-72` default), `SelectContent`, dropdowns, keyword/subcategory popovers for on-screen containment.

**P10 — Dashboard/charts.** Verify only, no redesign: charts must not impose page min-width.

**P11 — Global overflow + a11y.** Grep-driven pass on fixed widths/nowrap/absolute positioning. No `overflow-x-hidden` on html/body/main. 44px targets for hamburger, drawer items, tabs, pagination, icon-only actions; keep aria labels and focus trapping.

**P12 — Tests.** New `e2e/responsive.spec.ts` using the existing Playwright fixture: viewports 320/375/390/430/tablet/desktop/large across `/`, `/tv`, `/radio`, `/prensa`, `/prensa-escrita`, `/redes-sociales`, `/notificaciones`, `/envio-alertas`, `/reportes`, the four Publiteca routes, one route per Settings family, `/media-monitoring`, `/admin`, `/auth`. Assert `documentElement.scrollWidth <= clientWidth`, plus interaction checks (drawer open/navigate/close, tab scroll, filter open, dialog fit/scroll/close, player controls). Desktop regression pass at the end. No auth weakening.

## Sequencing
P1 ships usable mobile on its own. P2–P4 make screens navigable, P5–P9 make them comfortable, P10–P12 verify. Each phase ends with the overflow assertion on its touched routes.
