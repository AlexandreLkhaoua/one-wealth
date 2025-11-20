## Sprint 2 — Score + Profile + Alerts

This PR contains the Sprint 2 work: scoring service, profile endpoints, alerts and frontend integration.

What to review
- Backend: scoring logic (`backend/services/scoring.py`), profile endpoints and ownership check (`backend/routers/portfolios.py`).
- Frontend: `components/portfolio-score.tsx`, `components/portfolio-investor-profile.tsx`, `components/portfolio-alerts.tsx`.
- Tests: unit and integration tests under `backend/tests/`.
- SQL: migration `sql/supabase-migration-sprint2-add-portfolio-profile.sql` (must be applied to Supabase before merging to avoid runtime DB errors).

Checklist
- [ ] Run `npx tsc --noEmit` locally
- [ ] Run backend tests: `PYTHONPATH=backend ./.venv/bin/python -m pytest backend/tests -q`
- [ ] Apply SQL migration to Supabase
- [ ] Verify RLS / ownership in staging

Notes
- CI will run TypeScript check and backend pytest.
- The scoring thresholds are configurable in code comments; please review business thresholds.
