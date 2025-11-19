OneWealth — Sprint 2 (Score + Profile + Alerts)

This document explains what's included in Sprint 2, how to run locally, and migration steps required for Supabase.

What changed
- Backend: scoring service (`backend/services/scoring.py`), profile endpoints and `/score` endpoint (`backend/routers/portfolios.py`).
- Frontend: `components/portfolio-score.tsx` (Recharts radial gauge), `components/portfolio-investor-profile.tsx`, `components/portfolio-alerts.tsx` with CTA.
- Tests: unit tests and integration tests in `backend/tests/`.
- SQL migration: `sql/supabase-migration-sprint2-add-portfolio-profile.sql` (add portfolio profile columns).

Run locally
1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Ensure .env contains SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY
./start.sh
```

2) Frontend
```bash
# from repo root
npm install
npm run dev
```

Tests
- Python tests (backend):

```
# from repo root
PYTHONPATH=backend ./.venv/bin/python -m pytest backend/tests -q
```

- TypeScript check:
```
npx tsc --noEmit
```

Migration checklist (Supabase)
- Apply SQL migration to add profile columns on `public.portfolios`:
  - `sql/supabase-migration-sprint2-add-portfolio-profile.sql`
  - Run via psql or the Supabase SQL editor.

- Verify RLS policies and service_role usage:
  - The backend currently uses the service_role client for server-side operations; ensure service_role key remains secret.
  - For production, prefer RLS + JWT-based checks rather than service_role for per-user access.

PR notes
- Tests included: unit + integration
- Verify locally before merging

Contact
- If you need me to open the PR or push the branch, let me know the GitHub remote and I can create the branch and the PR.
