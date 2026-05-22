## Move Stats Grid After Feed Unificado

Move the Main Stats Grid section (7 stat cards: Prensa Digital, Radio, TV, Prensa Escrita, Feeds Activos, Clientes, Alertas) to appear after the `CombinedNewsFeedWidget` (Feed Unificado) in the dashboard layout.

### Changes
- **src/pages/Index.tsx**: Reorder the JSX blocks:
  1. Header
  2. Quick Actions
  3. Client Spotlight
  4. Combined News Feed (Feed Unificado)
  5. **Main Stats Grid** (moved here)
  6. Charts Row
  7. Category Breakdown
  8. Widgets Row
  9. Recent Activity & Notifications

No other files affected.