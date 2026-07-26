## Scope

Two outstanding tracks: the Policymaker workspace (Part 5) and the global design-system/platform layer (Part 6). Part 6 touches every existing workspace, so it lands second — after the last workspace exists — to avoid reworking it twice.

## Stage 1 — Policymaker Workspace (AGIE)

Runtime + APIs (no frontend analytics):
- `src/lib/governance-types.ts`, `governance-runtime.server.ts`, `governance-api.ts`
- `GET /api/governance/dashboard`, `POST /api/governance/query`, `GET /api/policy-impact`, `GET /api/resource-planning`, `POST /api/policy-simulation`, extend `/api/reports`

UI:
- `PolicymakerShell` with sidebar: Home, Governance Workspace, Strategic Intelligence, Policy Impact, Resource Planning, Executive Reports
- Left `StateOverviewPanel` (statewide KPIs, risk distribution, top/high-risk districts) + quick filters (FY, district, category incl. cyber/women safety/juvenile/organized/financial/traffic/violent/narcotics) as URL search state
- Centre `GovernanceDashboard` (trends, district comparison, investigation performance, conviction, budget, allocation, coverage) and `PolicySimulationPanel` (intervention presets → projected impact, budget, officer requirement, confidence, evidence — advisory notice)
- Right `ExecutiveBriefPanel` (section-by-section reveal) + `KeyRecommendations` (evidence, priority, impact, confidence)
- Routes: `/policymaker`, `/strategy`, `/impact`, `/resources`, `/reports` with skeleton / empty / error states and a small non-dominant executive AI assistant

## Stage 2 — Global Design System & Component Library (Part 6)

- Tokenise spacing scale (4/8/12/16/24/32/48) and card surfaces in `src/styles.css`; dark-only
- `src/components/system/`: Button variants (primary, secondary, ghost, danger, executive), StatusBadge, RiskBadge, KpiCard, IntelligenceCard, EvidenceCard, TimelineCard, GraphCard, CommandCard, ReportCard, MapCard, AlertCard, RecommendationCard, LoadingCard, DataTable (sort/filter/paginate/column visibility/export/sticky header)
- Refactor Investigator / Analyst / Supervisor / Policymaker panels onto these primitives so all four share one visual grammar

## Stage 3 — Global Shell Services

- `GlobalShell` used by every workspace: top nav + universal search (⌘K palette, FIR/person/vehicle/phone/district/station), notification centre (7 types, read/unread/priority/timestamp/deep link), officer profile menu (name, rank, station, district, language, settings, logout), persistent Bloomberg-style ticker
- Route-level code splitting per workspace; lazy-load graphs, maps, charts, reports

## Stage 4 — Visualization Upgrades

- Cytoscape.js network graph (zoom/pan/expand/collapse/highlight/search/legend/node details) with per-node-type colour + icon
- Leaflet + OpenStreetMap maps with hotspot, station, patrol, heatmap, boundary, deployment layers and clustering
- ECharts-backed chart set (line, bar, pie, radar, area, treemap, sunburst, heatmap) behind one styled wrapper

## Stage 5 — AI Experience & Reports

- Unified `AiCore` state machine: idle, listening, reasoning, speaking, success, warning, error, offline with smooth transitions, sized per workspace (large for Investigator, analytical for Analyst, command for Supervisor, compact for Policymaker)
- Voice interaction loop (transcription → reasoning animation → streaming response → synthesis) with all processing behind APIs
- Streaming response sections in order: Summary → Evidence → Reasoning → Recommendations → References
- One official report format (header, summary, evidence, visualizations, recommendations, references, digital signature placeholder) + government-style PDF export with CORTEX footer

## Stage 6 — Accessibility, Responsiveness, Audit

- Keyboard nav, focus rings, ARIA labels, AA contrast pass
- Desktop three-column / tablet two-column / mobile stacked across all workspaces without dropping intelligence
- Playwright verification of each workspace at three breakpoints

## Technical Notes

- Spline is not viable for the AI core here (heavy third-party scene runtime, SSR-hostile, no offline asset). The existing canvas-based `IntelligenceCore` will be extended into the full state machine — visually equivalent, faster, and fully controllable. Flag if you specifically require Spline.
- Catalyst services (Authentication, QuickML, Data Store, NoSQL, Stratus, Zia, SmartBrowz, API Gateway, Circuits, Push, Signals, Cron) are documented and abstracted behind the REST layer; the runtime modules stand in for them so every screen already talks pure REST and can be repointed at Catalyst without frontend changes.
- No business logic, ML, forecasting, or graph algorithms in frontend code — all of it stays in the runtime/API layer.

## Sequence

Stage 1 first (completes the four workspaces), then Stages 2–3 (shared shell and components), then 4–5 (visualizations and AI), then 6 (audit). Each stage is independently shippable.