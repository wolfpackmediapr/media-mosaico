# Make Publiteca mobile compatible

## Why it breaks on phones today

The app was built desktop-first. The viewport meta tag is correct and the base table component already scrolls, so nothing is fundamentally broken — but the navigation shell never adapts:

- `src/components/layout/Layout.tsx` uses `flex flex-col md:flex-row`, so below 768px the sidebar **stacks on top of the page** instead of hiding.
- `src/components/layout/Sidebar.tsx` has no breakpoint logic, no drawer, no `useIsMobile()`. On a 390px phone the user scrolls past roughly 400px of navigation (logo plus up to 12 labeled items) before reaching any content. The collapse toggle only shrinks it to an icon rail; it never becomes an overlay.
- `src/components/layout/Header.tsx` has no hamburger button, so there is nothing to open a drawer with.
- `src/hooks/use-mobile.tsx` exists but is only consumed by an unused shadcn primitive — no real screen uses it.

Secondary issues: tab bars with 3–4 fixed grid columns, filter toolbars built from fixed-pixel controls (180px + 140px + 140px = 460px, wider than a phone), and 25+ data tables with 5–8 columns and no column priority.

## What will change

### 1. Mobile navigation shell (the blocker)
- `Layout.tsx`: hold the mobile drawer state, stack correctly, and stop rendering the inline sidebar below `md`.
- `Sidebar.tsx`: keep current desktop behavior (collapsible rail) as `hidden md:flex`, and add a `Sheet`-based overlay mode that reuses the same menu list, permission filtering and active-route logic (no duplication). Tapping a link closes the drawer.
- `Header.tsx`: add a hamburger `Menu` button visible only below `md`, plus the Publimedia logo so mobile users still see branding. Trim the header title on narrow screens.
- Give nav items 44px minimum touch targets.

### 2. Tab bars that fit a phone
Convert fixed `grid-cols-N` tab bars to a horizontally scrollable flex row (hidden scrollbar), with icon-only labels under `sm` where labels are long:
- `src/pages/publiteca/RedesSociales.tsx`, `Tv.tsx`, `Radio.tsx`, `Prensa.tsx`
- `src/components/publiteca/PublitecaLayout.tsx`
- `src/components/prensa-escrita/PressTabsContainer.tsx`
- `src/components/monitoring/MonitoringTabs.tsx`
- `src/components/notifications/NotificationTabs.tsx`
- `src/components/settings/*/…SettingsTabs.tsx` and `SettingsNav.tsx`

### 3. Filter toolbars
Replace hardcoded widths with `w-full sm:w-[180px]` and make parent rows `flex flex-wrap gap-2`:
- `src/components/dashboard/DateRangeFilter.tsx`
- `src/components/alertas/AlertsDateRangePicker.tsx`
- `src/components/prensa/PrensaSearch.tsx`
- `src/components/monitoring/ProcessingJobsTable.tsx`
- `src/components/settings/clients/ClientFilter.tsx`, `MediaFilter.tsx`, `ParticipanteFilter.tsx`, `TvRatesFilter.tsx`

### 4. Data tables
For the heaviest tables, hide low-priority columns below `md` with `hidden md:table-cell`, keeping the primary column and actions always visible: `ClientsTable`, `ChannelsTable`, `ProgramsTable`, `StationsTable`, `MediaOutletsTable`, `ParticipantesTable`, `CategoriasTable`, `ProcessingJobsTable`, `DeliveryLogsTable`, and the rates tables. Also fix `SourcesTable`, where one column is pinned at `w-[80%]`.

### 5. Page padding and content grids
- `TvMainContent.tsx` and similar use `container mx-auto p-6`; reduce to `p-4 md:p-6` so phones don't lose 48px of width.
- `Footer.tsx` uses `container` without padding — add responsive padding.
- Media/video sections and the Radio/TV two-column control rows already use `md:grid-cols-2`, so they only need spacing tuning.

### 6. Verification
Screenshot-test the main routes at 390x844 and at 320px width (Inicio, Publiteca, TV, Radio, Prensa Digital, Redes Sociales, Notificaciones, Ajustes > Clientes) and assert `document.scrollWidth === clientWidth` (no horizontal overflow) on each.

## Notes
- No backend, data, prompt or business-logic changes — presentation only.
- Desktop layout stays visually identical; every change is gated behind a breakpoint.
- Suggested order: step 1 alone makes the app usable on a phone; steps 2–4 make each screen comfortable. Step 1 can ship on its own first if you prefer.