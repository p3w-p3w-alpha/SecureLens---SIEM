# SecureLens — Security Operations Platform

## Project Overview
A unified Security Operations Platform combining a real-time SIEM engine
with threat intelligence, AI-powered triage, an AI investigation chatbot,
and incident reporting. Solo project built feature-by-feature using Claude Code.

## Tech Stack
- Backend: Spring Boot 3.x, Java 17, PostgreSQL, Maven
- Frontend: React 18, React Router, Axios, Tailwind CSS (utility-only, generic)
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
│       ├── controller/         # REST controllers (Auth, Health, Log, Simulator, Alert)
│       ├── model/              # JPA entities (User, Log, Alert, Role, Severity, AlertStatus)
│       ├── repository/         # Spring Data JPA repos + Specifications
│       ├── detection/          # Detection rules (R-001 to R-008)
│       ├── intel/              # Threat intel providers (VT, AbuseIPDB, Shodan, NVD, OTX)
│       ├── service/            # Business logic (Auth, Log, LogSimulator, DetectionEngine, Alert, ThreatIntelAggregator)
│       ├── dto/                # Request/Response DTOs
│       ├── exception/          # Custom exceptions + GlobalExceptionHandler
│       ├── scheduler/          # Scheduled detection jobs
│       └── security/           # JWT auth filter, JwtUtil
├── frontend/                   # React application
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── components/         # Reusable components (Navbar, ProtectedRoute)
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
Phase 7 — Threat Intelligence Hub (completed)

## Completed Phases
- Phase 1: Project skeleton — Spring Boot backend + React frontend with Vite, Tailwind, health endpoint
- Phase 2: JWT Authentication — User entity, register/login with BCrypt + JWT, protected routes, AuthContext
- Phase 3: Log Ingestion — Log entity with Specification-based dynamic filtering, batch ingestion API, paginated log viewer with color-coded severity badges and expandable rows
- Phase 4: Log Simulator — 9 scenarios (8 attack patterns + normal traffic), each precisely matching Phase 5 detection rule triggers
- Phase 5: Complete SIEM detection engine with 8 MITRE ATT&CK rules — Brute Force (R-001), Impossible Travel (R-002), Privilege Escalation (R-003), Data Exfiltration (R-004), Port Scan (R-005), Lateral Movement (R-006), Malware Beacon (R-007), Off-Hours Access (R-008). @Scheduled engine runs every 60s with deduplication.
- Phase 6: Alert management dashboard — filtered/paginated alert list with stats cards, detail page with evidence logs, status updates (Investigating/Resolved/False Positive), Navbar alert count badge, AI Triage placeholder ready for Phase 8
- Phase 7: Threat Intelligence Hub — 5 providers (VirusTotal, AbuseIPDB, Shodan, NVD, AlienVault OTX), 1-hour caching in threat_intel_cache table, parallel async lookups via CompletableFuture, risk score normalization 0-100, alert enrichment, search page for IPs/hashes/CVEs, graceful degradation for missing/down providers

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

## Important Notes
- IMPORTANT: Simulator scenarios are designed to exactly trigger the 8 detection rules in Phase 5. Do not modify the simulator's timing, counts, or patterns without also updating the corresponding detection rule thresholds.
- This is an MVP — functional correctness over visual polish
- All 8 MITRE ATT&CK detection rules must work correctly
- Log simulator must generate realistic test data
- Mistral AI integration is a key differentiator — it must work well
- AI chatbot uses two-call Mistral pattern (tool selection → answer generation)
- Frontend should be testable visually for every feature
