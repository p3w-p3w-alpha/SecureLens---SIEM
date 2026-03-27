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
│       ├── controller/         # REST controllers (Auth, Health, Log, Simulator)
│       ├── model/              # JPA entities (User, Log, Alert, Role, Severity, AlertStatus)
│       ├── repository/         # Spring Data JPA repos + Specifications
│       ├── detection/          # Detection rules (R-001 to R-004)
│       ├── service/            # Business logic (Auth, Log, LogSimulator, DetectionEngine)
│       ├── dto/                # Request/Response DTOs
│       ├── exception/          # Custom exceptions + GlobalExceptionHandler
│       ├── scheduler/          # Scheduled detection jobs
│       └── security/           # JWT auth filter, JwtUtil
├── frontend/                   # React application
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── components/         # Reusable components (Navbar, ProtectedRoute)
│       ├── pages/              # Page-level components (Home, Login, Register, Dashboard, Logs, Simulator)
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
Phase 5A — Detection Engine + Rules R-001 to R-004 (completed)

## Completed Phases
- Phase 1: Project skeleton — Spring Boot backend + React frontend with Vite, Tailwind, health endpoint
- Phase 2: JWT Authentication — User entity, register/login with BCrypt + JWT, protected routes, AuthContext
- Phase 3: Log Ingestion — Log entity with Specification-based dynamic filtering, batch ingestion API, paginated log viewer with color-coded severity badges and expandable rows
- Phase 4: Log Simulator — 9 scenarios (8 attack patterns + normal traffic), each precisely matching Phase 5 detection rule triggers
- Phase 5A: Detection Engine — @Scheduled 60s cycle with deduplication, 4 rules: Brute Force (R-001), Impossible Travel (R-002), Privilege Escalation (R-003), Data Exfiltration (R-004). Detection rules R-005 to R-008 will be added in Phase 5B.

## Important Notes
- IMPORTANT: Simulator scenarios are designed to exactly trigger the 8 detection rules in Phase 5. Do not modify the simulator's timing, counts, or patterns without also updating the corresponding detection rule thresholds.
- This is an MVP — functional correctness over visual polish
- All 8 MITRE ATT&CK detection rules must work correctly
- Log simulator must generate realistic test data
- Mistral AI integration is a key differentiator — it must work well
- AI chatbot uses two-call Mistral pattern (tool selection → answer generation)
- Frontend should be testable visually for every feature
