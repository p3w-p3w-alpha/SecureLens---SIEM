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
│       ├── controller/         # REST controllers
│       ├── model/              # JPA entities
│       ├── repository/         # Spring Data JPA repos
│       ├── service/            # Business logic
│       ├── dto/                # Request/Response DTOs
│       ├── scheduler/          # Scheduled detection jobs
│       └── security/           # JWT auth filter
├── frontend/                   # React application
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── components/         # Reusable components
│       ├── pages/              # Page-level components
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
Phase 1 — Project skeleton setup

## Important Notes
- This is an MVP — functional correctness over visual polish
- All 8 MITRE ATT&CK detection rules must work correctly
- Log simulator must generate realistic test data
- Mistral AI integration is a key differentiator — it must work well
- AI chatbot uses two-call Mistral pattern (tool selection → answer generation)
- Frontend should be testable visually for every feature
