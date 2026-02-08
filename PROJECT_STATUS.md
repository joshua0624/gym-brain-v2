# GymBrAIn - Active Mission Log

## 🚀 Current Milestone: V2 Phase 1 (Database Schema)
**Status:** Not Started
**Spec:** `docs/v2-spec.md`
**Branch Strategy:** Feature branches per phase (`v2/phase-N-*`) → merge to `dev`.

### V2 Phases
| Phase | Focus | Status |
|-------|-------|--------|
| 1 (Data) | Migrations 006-008 (plans, groups, reactions) | Not Started |
| 2 (Logic) | `/src/lib/progression.js` + unit tests | Blocked by Phase 1 |
| 3 (API) | Plan CRUD, Group CRUD, coach endpoints | Blocked by Phase 2 |
| 4 (UI) | "Start Plan" button, Sequence Mode | Blocked by Phase 3 |
| 5 (AI) | Interview Modal, AI endpoint integration | Blocked by Phase 4 |

## ⚠️ Active Blockers & Risks
- **Non-atomic sync** (known V1 issue): `syncService.js` uses individual inserts, not a transaction.
- **Phase 1 caution**: Verify `is_compound` seeding after migration 006 — ILIKE patterns must match actual exercise names in `002_seed_exercises.sql`.
- **IndexedDB version bump**: Adding `plan` and `feed` stores requires incrementing the DB version in `/src/lib/indexedDB.js`.

## ✅ V1 Summary (Complete)
All V1 features production-ready as of 2026-02-05:
- Auth (JWT + refresh + password reset), Workout logging (draft lifecycle, offline-first)
- Templates, Exercise library (158 seeded + custom), History (responsive table/card)
- Progress charts + PR tracking (Brzycki), AI assistant (GPT-4o-mini, rate-limited)
- PWA/Service Worker, IndexedDB sync queue, Toast system (all pages)
- **387 unit/integration tests passing**, 12 E2E tests.

## 📝 Implementation Notes (Still Relevant)
- **Sync**: Uses `POST /workouts/sync` (not `POST /workouts`) for complete workout creation.
- **Data Format**: Sync endpoint expects camelCase (`exerciseId`, `setNumber`, etc.).
- **V1 AI endpoint**: `POST /api/ai/workout-assistant` remains active alongside new V2 AI endpoints.

## 📂 Quick Links
- **V2 Spec**: `docs/v2-spec.md`
- **V1 Spec**: `docs/spec.md`
- **Patterns**: `docs/protocols.md`
