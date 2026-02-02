# GymBrAIn Context Map

## 🎯 AI Strategy (Cost-Optimized)
- **Primary Source**: Read `PROJECT_STATUS.md` first for every task.
- **Deep Logic**: Reference `docs/spec.md` only if logic is ambiguous.
- **Pre-Mortem**: For system changes, follow the protocol in `docs/protocols.md`.
- **Large Tasks**: Use `gemini-mcp` for any analysis >5 files.

## 🛠 Critical Technical Constraints
- **DB**: **MUST USE** `@neondatabase/serverless`. No exceptions.
- **Environment**: `/src/lib` (Client only) | `/api/_lib` (Server only). 
- **Offline-First**: IndexedDB is the source of truth; server sync is background only.
- **Data**: Weights in **lbs** (DECIMAL 6,2), Timestamps in **UTC**.

## 🏗 Essential Architecture
- **Sync**: Last-write-wins; background sync every 30s.
- **Drafts**: Atomically delete server `WorkoutDraft` upon `Workout` creation.
- **Auth**: JWT (access/refresh) + `requireAuth` middleware.

## 📂 Key References
- `PROJECT_STATUS.md`: Current sprint & blockers.
- `docs/protocols.md`: Detailed code patterns & "Pre-Mortem" prompt.
- `docs/spec.md`: Full feature requirements.
- `.claudeignore`: Strictly enforced to prevent context bloat.

## 🚀 Commands
- `npm run dev`: Full-stack (Vercel)
- `npm run db:push`: Schema updates