# SecureLens — Security Operations Platform

## Project Overview
A unified Security Operations Platform combining a real-time SIEM engine
with threat intelligence, AI-powered triage, an AI investigation chatbot,
and incident reporting. Solo project built feature-by-feature using Claude Code.

## Tech Stack
- Backend: Spring Boot 3.x, Java 17, PostgreSQL, Maven
- Frontend: React 18, React Router, Axios, Tailwind CSS, framer-motion, react-globe.gl, Three.js, @react-three/fiber+drei, Recharts, shadcn/ui, lucide-react
- AI: Mistral API (mistral-small-latest) for alert triage + investigation chatbot
- APIs: VirusTotal, AbuseIPDB, Shodan, NVD, AlienVault OTX
- Deployment: Railway (backend), Vercel (frontend)

## Project Structure
```
securelens/
├── backend/                    # Spring Boot application
│   ├── pom.xml
│   └── src/main/java/com/securelens/
│       ├── SecureLensApplication.java
│       ├── config/             # Security config, CORS, API keys
│       ├── controller/         # REST controllers (Auth, Health, Log, Simulator, Alert, Chat)
│       ├── model/              # JPA entities (User, Log, Alert, Role, Severity, AlertStatus)
│       ├── repository/         # Spring Data JPA repos + Specifications
│       ├── detection/          # Detection rules (R-001 to R-008)
│       ├── intel/              # Threat intel providers (VT, AbuseIPDB, Shodan, NVD, OTX)
│       ├── ai/                 # Mistral AI integration (triage, chatbot)
│       ├── service/            # Business logic (Auth, Log, LogSimulator, DetectionEngine, Alert, ThreatIntelAggregator)
│       ├── dto/                # Request/Response DTOs
│       ├── exception/          # Custom exceptions + GlobalExceptionHandler
│       ├── scheduler/          # Scheduled detection jobs
│       └── security/           # JWT auth filter, JwtUtil
├── frontend/                   # React application
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── components/         # Reusable components (Navbar, ProtectedRoute, intel/)
│       ├── pages/              # Page-level components (Home, Login, Register, Dashboard, Logs, Simulator, Alerts, AlertDetail, Intel)
│       ├── services/           # API call functions (axios)
│       ├── context/            # Auth context
│       └── utils/              # Helpers
├── CLAUDE.md
└── .gitignore
```

## Database
PostgreSQL with tables: users, logs, alerts, threat_intel_cache,
incidents, audit_trail, saved_hunts

## Conventions
- REST endpoints under /api/v1/
- JWT authentication on all endpoints except /api/v1/auth/**
- DTOs for all request/response bodies (never expose entities directly)
- Service layer handles all business logic
- Controllers are thin — validation + delegation only
- Frontend uses functional components with hooks
- Generic Tailwind styling only (no custom design system yet)
- Every feature must have both backend AND frontend working together

## Current Phase
Phase 17 — VOID Design System + Artistic Reconstruction. Unique cinematic sci-fi command center with:
- HudFrame component: animated L-shaped corner brackets that expand/brighten on hover, optional scan-line sweep, pulsing border
- TiltCard component: 3D perspective tilt on mouse move (useMotionValue + useSpring), parallax inner content (translateZ), reusable
- CinematicWipe: ice-blue light bar sweeps horizontally across screen during page transitions (400ms)
- Reactor button: double-border auth button with flash animation on click
- Connected Data Nodes: circuit-board SVG lines between dashboard stat cards with traveling pulse dot
- Split-screen login: globe left, HUD panel right with staggered field entrance animations + Shield rotation
- Void palette (#06060a + #7dd3fc), Barlow Condensed typography, hex-dot indicators, void-scan hover effect

## Data Integrity
- ALL displayed numbers come from real API responses — zero hardcoded display data
- Dashboard: stats from /dashboard/stats, charts from /dashboard/trends + /event-types + /hourly-activity, audit from /audit
- Globe: points/arcs from real alert sourceIps mapped through geoData.js geo lookup
- Alerts/Logs/Incidents/Admin: all from their respective CRUD endpoints
- Intel: from real VirusTotal/AbuseIPDB/Shodan/OTX/NVD API responses
- Empty states: all pages show appropriate "No data" messages when DB is empty
- Login page globe arcs: decorative ambient only (not claiming to be real data)
- geoData.js IP→coordinate mappings: utility lookup table (not display data)

## Threat Intelligence Provider Status
| Provider | Auth Method | Key In .env | Error Handling | Notes |
|----------|-----------|-------------|----------------|-------|
| VirusTotal | Header: x-apikey | Yes | HTTP 401/403/404/429 specific messages | Free tier: 4 req/min |
| AbuseIPDB | Header: Key | Yes | HTTP 401/422/429 specific messages | Free tier: 1000 checks/day |
| Shodan | Query param: ?key= | Yes | 404 returns available=true "IP not indexed" (graceful) | Free tier limited |
| AlienVault OTX | Header: X-OTX-API-KEY | Yes | HTTP 400/401/404/429 specific messages | Can be slow (15s timeout) |
| NVD | None (public) | N/A | HTTP 403 rate limit message | 5 req/30s without key |

### API Key Loading
- spring-dotenv 4.0.0 dependency loads .env from project root
- application.yml uses `${env.VT_API_KEY:${VT_API_KEY:}}` (dotenv fallback to env var)
- All 5 providers log key status on startup via @PostConstruct
- .env file exists at project root with symlink to backend/.env

## Completed Phases
- Phase 1: Project skeleton — Spring Boot backend + React frontend with Vite, Tailwind, health endpoint
- Phase 2: JWT Authentication — User entity, register/login with BCrypt + JWT, protected routes, AuthContext
- Phase 3: Log Ingestion — Log entity with Specification-based dynamic filtering, batch ingestion API, paginated log viewer with color-coded severity badges and expandable rows
- Phase 4: Log Simulator — 9 scenarios (8 attack patterns + normal traffic), each precisely matching Phase 5 detection rule triggers
- Phase 5: Complete SIEM detection engine with 8 MITRE ATT&CK rules — Brute Force (R-001), Impossible Travel (R-002), Privilege Escalation (R-003), Data Exfiltration (R-004), Port Scan (R-005), Lateral Movement (R-006), Malware Beacon (R-007), Off-Hours Access (R-008). @Scheduled engine runs every 60s with deduplication.
- Phase 6: Alert management dashboard — filtered/paginated alert list with stats cards, detail page with evidence logs, status updates (Investigating/Resolved/False Positive), Navbar alert count badge, AI Triage placeholder ready for Phase 8
- Phase 7: Threat Intelligence Hub — 5 providers (VirusTotal, AbuseIPDB, Shodan, NVD, AlienVault OTX), 1-hour caching in threat_intel_cache table, parallel async lookups via CompletableFuture, risk score normalization 0-100, alert enrichment, search page for IPs/hashes/CVEs, graceful degradation for missing/down providers
- Phase 8: Mistral AI Alert Triage — mistral-small-latest integration for structured alert analysis. JSON response with severity assessment, attack context, recommended actions, false positive likelihood, reasoning, and related indicators. Results persisted in alerts.ai_triage_result column. MistralService is reusable for Phase 9 (chatbot).
- Phase 9: AI Investigation Assistant — chatbot with two-call Mistral pattern (tool selection → answer generation), 6 database-backed tools (query_events, query_alerts, get_alert_detail, get_top_attackers, get_event_stats, investigate_ioc), slide-in panel accessible site-wide via floating button, conversation history in React state, keyword-based fallback on timeout
- Phase 10: Threat Hunting — dynamic query builder (6 fields, 4 operators), time range filtering, GROUP BY with threshold, saved hunts with reload/rerun, promote findings to manual alerts (HUNT-MANUAL)
- Phase 11: Incident Reporting — incident management with OPEN→CONTAINED→ERADICATED→RECOVERED→CLOSED lifecycle, timeline notes, multi-alert linking, automated PDF report generation with Apache PDFBox including cover page, timeline, alert details, and threat intel data
- Phase 12: Dashboard & Audit Trail — real-time SOC dashboard with Recharts (bar chart by severity, pie chart by rule, line chart 24h trend), 4 stat cards, recent alerts feed, audit trail activity feed with 30s auto-refresh. Audit trail captures significant actions (login, status changes, triage, incidents, hunts, intel lookups). All services emit audit events wrapped in try-catch.
- Phase 13A: Real Log Ingestion — JSON, CSV, and syslog format support with flexible field name normalization (handles 7+ naming conventions per field: src_ip/source_ip/sourceIp/src/source_address all map to sourceIp). File upload with drag-and-drop, manual paste with format tabs, sample file downloads, auto-format detection. Syslog parsing extracts priority→severity, IP from message, event type from keywords.
- Phase 13C: User Management — admin panel with user CRUD, role management (ADMIN/ANALYST), role-based access control on /api/v1/admin/** endpoints via hasAuthority("ROLE_ADMIN"), first-user-is-admin logic, AdminRoute frontend protection, audit logging for role changes and deletions
- Phase 15A: Design System + Sidebar + Dashboard — dark cyber command center theme (#050a18 bg, #00d4ff cyan accent), collapsible sidebar with lucide-react icons and framer-motion animations, dashboard with animated stat counters, 2D threat map with animated arcs, Recharts dark theme (bar/donut/area charts), live threat ticker, framer-motion page transitions, dot grid background
- Phase 15B: Alerts page with dark cyber theme — severity glow badges with pulsing critical dots, cyan-outlined MITRE tags, dark styled filters/dropdowns, staggered row animations. Alert detail with two-column layout, expandable evidence logs with JSON syntax coloring (keys cyan, values green), circular SVG risk score gauges for threat intel, skeleton loading for AI triage, status buttons with press animation
- Phase 15C: Cinematic Threat Intel page — hero search with glassmorphism input and auto-detect type badges (IPv4/CVE/Hash), animated SVG risk gauges with gradient strokes (green/yellow/red), provider cards with accent color bars and staggered animations, mini gauges per provider, Copy Raw buttons, floating particles, example chips, search history with animated entries, floating shield empty state
- Phase 15C+: Intel refinements — shadcn Sheet-based provider detail viewer with full raw JSON response (syntax-colored: keys cyan, strings green), risk gauge in Sheet header, Copy button, Details button on each provider card
- Globe Rendering Quality Overhaul — ThreatGlobeGL upgraded to command-center grade: NASA Blue Marble texture (earth-blue-marble.jpg) replacing earth-night.jpg, night-sky.png star background, atmosphere glow (#00d4ff, altitude 0.18), improved arc rendering (altitude 0.4, stroke 0.4, dashLength 0.4, gap 0.15, animateTime 1800), data-driven point sizing/altitude based on alert count, severity-colored markers (CRITICAL red, HIGH orange, MEDIUM yellow, LOW blue), zoom limits (200-600 distance), auto-rotation pause on user interaction with 3s resume, initial camera centered on Europe/Morocco (lat:30, lng:5, alt:2.2), animateIn enabled, enhanced HTML point tooltips with count display. Dashboard globe container uses shadcn Badge for source count and critical alert indicators. All changes visual-only — zero data-fetching logic modified.
- Phase 16H: Production SOC Dashboard — Complete rebuild of DashboardPage.jsx as a data-dense SOC command center. Globe-centric layout: react-globe.gl (420px) takes 65% left side, stacked charts in 35% right column. Globe shows REAL alert data: topSourceIps mapped to coordinates via geoData.js, arcs from each attacker IP to Morocco home base, labelsData for top 5 IPs floating on globe, clickable points (onPointClick navigates to /intel?ip=X). IntelPage updated with useEffect to read ?ip= URL param and auto-trigger search on mount. 7 chart types: (1) Alerts by Severity horizontal BarChart with severity colors, (2) Alerts by Rule DonutChart with center total count, (3) Top Attacking IPs mini bar chart with IP addresses linking to /intel, (4) 24h Alert Trend AreaChart with cyan gradient, (5) Hourly Activity Heatmap with 24 columns colored by intensity (blue→cyan→yellow→red), (6) Event Type Distribution PieChart, (7) MITRE ATT&CK Coverage grid showing 7 tactics with active/inactive state based on real alertsByRule data. Backend: added GET /api/v1/dashboard/event-types (event_type→count Map) and GET /api/v1/dashboard/hourly-activity (24h by-hour TrendPoints) endpoints to DashboardController + DashboardService. All data from real database queries with 30s auto-refresh. Recent Alerts feed (8 items, clickable) + Activity audit feed (10 items). All glassmorphism cards with GlassTip tooltip component.
- Phase 16G: Space-Dark Glassmorphism Overhaul — Complete visual redesign to premium Dashcube-inspired aesthetic. Body background changed from flat #050a18 to rich space gradient (#080420 base with radial gradients of #0d1b4a and #1a0b3e). Added global Stars component with 40 CSS-animated twinkling particles. All cards across ALL pages converted to glassmorphism: bg-white/[0.06] backdrop-blur-xl border-white/[0.08] rounded-2xl shadow-glass. All inputs converted to glass-input class. Tailwind config updated with new cyber.deepest=#080420. Dashboard rebuilt globe-centric: globe takes flex-1 (60%), stat cards stacked vertically in w-72 right column, charts in 2-column grid below, Recharts with glassmorphism tooltip. Sidebar rebuilt: bg-white/[0.04] backdrop-blur-xl, "NAVIGATION" section label, avatar gradient from-cyber-cyan to-purple-500. IntelPage/ProviderCard/ScanningLoader/SearchHistory all upgraded to glassmorphism. LoginPage/RegisterPage gradient overlays use #080420. All 14 pages + 4 components verified zero remaining bg-cyber-card/bg-cyber-deepest/border-cyber-border references.
- Phase 16E: Critical globe fixes — ThreatGlobeGL component rebuilt with fullscreen mode (absolute inset-0 for login viewport fill), responsive container measurement, onGlobeReady callback exposing globe instance, pointLabel HTML tooltips, ringColor with opacity fade function. LoginPage + RegisterPage fixed to use fullscreen prop so react-globe.gl fills entire viewport as background with gradient overlays for form readability. IntelPage completely rewritten to use react-globe.gl instead of old Three.js ThreatGlobe3D: interactive orbit controls, accumulated points/arcs across session (useState arrays), risk-colored points (red >70, yellow 31-70, green <=30), clickable points via onPointClick triggering intel lookup, ringsData with expanding rings at search location, pointOfView auto-focus on searched IP, globe spins faster during loading (autoRotateSpeed 2.0). Dashboard verified using ThreatGlobeGL with real alert sourceIps via getArcData/getPointData.
- Phase 16D: Full app cinematic dark redesign — ALL pages converted to dark cyber command center theme (#050a18/#0a1628/#111d35 with #00d4ff cyan accent). react-globe.gl (earth-night.jpg texture, cyan atmosphere, animated arcs/points/rings) as central visual on Login (full-screen hero with 8 threat arcs), Dashboard (350px threat map replacing 2D canvas, fed by real alert sourceIps), and Intel (interactive with OrbitControls, ringsData on search). Shared ThreatGlobeGL component with lazy loading. Shared src/utils/geoData.js with IP→geo mapping for 12+ known IPs + deterministic hash for unknowns. Global index.css switched to dark body (#050a18), dark scrollbar, dark glass-card class. LoginPage + RegisterPage: full-viewport globe background with glassmorphism form overlay, Shield icon with cyan glow, dark inputs with Mail/Lock/User icons. DashboardPage: dark stat cards with animated counters, Recharts dark theme (dark tooltips, cyan area chart), globe threat map, dark audit log. AlertsPage: dark table with severity/status glow badges, glassmorphism filter bar, MITRE tags in cyan. HuntPage: dark hunting console with Crosshair icon, AnimatePresence on condition rows, dark query builder, saved hunts sidebar. IncidentsPage: dark table with status lifecycle badges. IncidentDetailPage: horizontal status lifecycle progress bar (green=done, cyan=current, gray=future), vertical timeline with cyan dots, PDF report button. AdminPage: dark admin with purple ADMIN / cyan ANALYST role badges, UserPlus/Trash2 icons. ChatPanel: glassmorphism panel (backdrop-blur-xl bg-[#0a1628]/95), cyan gradient floating button with Bot icon, framer-motion slide-up, typing dots, dark message bubbles. Sidebar: tuned to cyber-deepest bg, cyan active indicators, dark profile section. HomePage: dark landing with Shield icon, health check, Sign In/Register buttons.
- Phase 16B+C: Cinematic page redesigns — Logs, Ingest, Simulator pages rebuilt with dark cyber command center theme. LogsPage: terminal-style forensics console with monospace font throughout, severity glow badges, glassmorphism filter bar with dark inputs, expandable rows with framer-motion layout animation, JSON metadata syntax coloring (keys cyan, values green, numbers orange), staggered row entrance animation, terminal cursor empty state, LIVE FEED indicator, dark pagination. IngestPage: secure data intake terminal with animated drag-drop zone (pulsing dashed border, glow on hover, floating Upload icon), format tabs with animated cyan/amber/purple active indicator (framer-motion layoutId), terminal-style textarea (green text on dark, monospace), success flash animation (green pulse across card), animated result counters, expandable error code block. SimulatorPage: cyber range attack simulation console with scenario toggle cards (9 scenarios, each with lucide-react icon, severity dot, toggle switch with spring animation, hover states), Select All toggle, dark config inputs, LAUNCH SIMULATION button with gradient and glow, animated results table with staggered rows and per-scenario breakdown with icons and severity dots, SIMULATION COMPLETE banner, dual navigation links (Logs + Alerts).
- Phase 16B: Cinematic Threat Intelligence Redesign — Complete rebuild of IntelPage and AlertDetailPage enrichment section into a CIA/NSA-style cyber command center. New component library in components/intel/: (1) ThreatGlobe3D — interactive 3D globe using @react-three/fiber + drei with wireframe sphere, lat/lng grid lines, animated threat arcs (QuadraticBezierLine with dash animation), glowing points at threat source and Morocco home base, Stars starfield, OrbitControls, auto-rotation, sonar ring animations during scanning, Html overlay labels, lazy-loaded for code splitting. (2) RiskGauge — spring-physics animated SVG gauge with gradient stroke (green/yellow/red), rotating inner dashed ring, useSpring bouncy counter, orbiting dots, pulsing ambient glow. (3) MiniGauge — compact provider gauge variant. (4) ProviderCard — classified-document styled cards with shimmer accent bars, INTEL REPORT watermark, hover lift+glow, SIGNAL LOST state for unavailable providers with scan-line animation. (5) ScanningLoader — cinematic loading with sonar pulse rings, cycling provider names via AnimatePresence, skeleton cards with vertical scan-line, indeterminate progress bar. (6) SearchHistory — terminal mission log with monospace timestamps, risk-colored borders, spring animations. (7) geoUtils.js — IP-to-geolocation mapping for common IPs with deterministic hash for unknowns. (8) intel-styles.css — scoped CSS animations (scanline, shimmer, sonar, orbit, float-particle, pulse-glow, scan-vertical, breathe, rotate-slow, progress-indeterminate) with prefers-reduced-motion support. AlertDetailPage enrichment now includes mini 3D globe, shared RiskGauge/ProviderCard components, and Sheet for raw JSON. Tailwind config extended with cyber-* color tokens and glow shadows.

## Detection Rules Quick Reference
| Rule ID | Name | Severity | MITRE Tactic | MITRE Technique | Detection Window |
|---------|------|----------|-------------|-----------------|-----------------|
| R-001 | Brute Force Login | HIGH | TA0006 | T1110 | 10 min |
| R-002 | Impossible Travel | CRITICAL | TA0001 | T1078 | 30 min |
| R-003 | Privilege Escalation | HIGH | TA0004 | T1548 | 10 min |
| R-004 | Data Exfiltration | CRITICAL | TA0010 | T1041 | 15 min |
| R-005 | Port Scan | MEDIUM | TA0007 | T1046 | 5 min |
| R-006 | Lateral Movement | HIGH | TA0008 | T1021 | 15 min |
| R-007 | Malware Beacon (C2) | CRITICAL | TA0011 | T1071 | 30 min |
| R-008 | Off-Hours Access | LOW | TA0001 | T1078 | 60 min |

## API Key Environment Variables
- VT_API_KEY — VirusTotal API key
- ABUSEIPDB_API_KEY — AbuseIPDB API key
- SHODAN_API_KEY — Shodan API key
- OTX_API_KEY — AlienVault OTX API key
- MISTRAL_API_KEY — Mistral AI API key (Phase 8)

## AI Architecture Notes
- AI chatbot uses two-call Mistral pattern (tool selection → answer generation)
- Mistral never touches the database directly — all data access is through controlled tool calls executed by Spring Boot
- MistralService is shared between triage (Phase 8) and chatbot (Phase 9)

## Important Notes
- IMPORTANT: Simulator scenarios are designed to exactly trigger the 8 detection rules in Phase 5. Do not modify the simulator's timing, counts, or patterns without also updating the corresponding detection rule thresholds.
- This is an MVP — functional correctness over visual polish
- All 8 MITRE ATT&CK detection rules must work correctly
- Log simulator must generate realistic test data
- Mistral AI integration is a key differentiator — it must work well
- AI chatbot uses two-call Mistral pattern (tool selection → answer generation)
- Frontend should be testable visually for every feature
