Title: Sprint 2: Score + Profile + Alerts

Summary:
This PR implements Sprint 2: a diagnostic scoring system for portfolios, investor profile management, and initial alerting.

Backend:
- `backend/services/scoring.py`: scoring logic producing 4 subscores, global score (0-100) and alert list.
- `backend/routers/portfolios.py`: GET/PATCH profile endpoints and GET /score endpoint with ownership check (403 if token user != portfolio owner).
- `backend/utils/supabase_client.py`: service-role Supabase client helper.
- Tests: unit tests and integration tests under `backend/tests/` (edge cases included).

Frontend:
- `components/portfolio-score.tsx`: Recharts RadialBar gauge, subscores, fetches score endpoint.
- `components/portfolio-investor-profile.tsx`: profile editor (GET/PATCH).
- `components/portfolio-alerts.tsx`: alert list with CTA to client dashboard.
- Wired into `app/dashboard/client/[id]/page.tsx`.

Database / Migration:
- `sql/supabase-migration-sprint2-add-portfolio-profile.sql` must be applied to the Supabase database before using the PATCH profile endpoint in production. It adds columns to `public.portfolios`.

How to test locally (short):
1. Backend:
   - create and activate venv in `backend` and install requirements
   - ensure SUPABASE_URL, SUPABASE_KEY, and SUPABASE_SERVICE_ROLE_KEY are set
   - run `./start.sh` and verify `GET /health`
   - run `PYTHONPATH=backend ./.venv/bin/python -m pytest backend/tests -q`
2. Frontend:
   - run `npm ci` and `npm run dev`
   - open `/dashboard/client/<portfolio-id>` to see score and alerts

CI:
- GitHub Actions workflow added in `.github/workflows/ci.yml` to run TypeScript check and backend pytest.

Notes / TODOs before merge:
- Apply SQL migration in Supabase.
- Review scoring thresholds and business rules.
- Consider replacing service-role usage with RLS validation in production.

---

(You can copy/paste this into the GitHub PR description.)