# CLAUDE.md - GymBrAIn Project

## Project Context
Full-stack workout tracking PWA. Portfolio project (10-20 users).
**Focus:** Reliability, offline-first, clean data modeling. Prefer serverless patterns & pragmatic solutions.

## AI Collaboration Protocol (CRITICAL)
1.  **Delegation Policy:** If a task requires analyzing >5 files or architectural planning >500 words, you **MUST** first use the `gemini-mcp` tool to generate a high-level technical draft.
2.  **Second Opinion Loop (The "Pre-Mortem"):** Before applying any "Large Implementation" or "System Change":
    * **Draft:** Generate your proposed implementation plan.
    * **Review:** Send the plan to Gemini via MCP with this specific prompt:
        * *"Review this plan as a Senior Architect. Explicitly check for these 3 failure modes:*
            * *1. **Data Integrity:** Will this create 'zombie drafts' or overwrite sync conflicts?*
            * *2. **Offline Logic:** Does this rely on network calls that will fail offline?*
            * *3. **Performance:** Does this risk exhausting the Neon connection pool?*
        * *Output: 'PASS' or 'FAIL' with a list of specific blocking issues."*
    * **Refine:** You cannot proceed until Gemini returns a 'PASS'.
3.  **Token Conservation:** Use Gemini for broad "What if?" questions or "Explain this folder" tasks to preserve Claude's context window for coding.

## Documentation Reference
* **PROJECT_STATUS.md**: Current phase, blockers, tested items. (**Read First**)
* **IMPLEMENTATION_PLAN.md**: Phase-by-phase code patterns. (**Static**)
* **planchanges.md**: Changelog of fixes & architectural decisions. (**Update on fix**)
* **PHASE_X_SUMMARY.md**: Implementation details of completed phases.
* **GymBrAIn_Specification_v1_2_2_FINAL.md**: Feature requirements & logic. (**Source of Truth**)

## Tech Stack
* **Frontend:** React (Hooks), PWA (Service Worker + IndexedDB).
* **Backend:** Node/Express on Vercel Serverless.
* **DB:** PostgreSQL via Neon (`@neondatabase/serverless` - **REQUIRED**).
* **Auth:** JWT (access + refresh), bcrypt.
* **AI:** OpenAI GPT-4o-mini (Server-proxy only, 5s timeout).

## Essential Workflow
1.  **Read Spec** → **Plan DB/API/UI** → **Implement Server First** → **Validate Offline**.
2.  **NEVER commit** without explicit approval.
3.  **Offline-First:** IndexedDB is source of truth; sync conflicts = last-write-wins.

## Critical Technical Constraints
### 1. Database Driver
**MUST USE** `@neondatabase/serverless` for connection pooling.
```javascript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
2. Offline & Sync Logic
Drafts: Saved to WorkoutDraft (server) & IndexedDB. Deleted atomically upon Workout creation.

Images: Text-only offline. No image caching.

Data: Weights in lbs (DECIMAL 6,2). Timestamps in UTC.

Sync: Background sync every 30s. Failures tracked client-side.

3. Architecture Rules
/src/lib/: Client-side ONLY.

/api/_lib/: Server-side ONLY (DB, Auth). NEVER import in src.

AI Guardrails: Never expose keys to client. Graceful degradation if AI fails.

Core Structure
/src
  /lib         # Client utilities (Browser)
/api
  /_lib        # Server utilities (Node.js - DB, Auth)
    db.js      # Shared SQL instance
  /workouts    # API Endpoints
docs/          # Specifications
Common Patterns
API Route Boilerplate
Always use requireAuth middleware and standard response format.

JavaScript
import { sql } from '../_lib/db.js'; // Relative import from _lib
import { requireAuth } from '../_lib/middleware/auth.js';

async function handleGet(req, res) {
  const userId = req.user.userId;
  // Use shared sql instance
  const data = await sql`SELECT * FROM table WHERE user_id = ${userId}`;
  return res.json(data);
}
// Export handler with method switching...
Development Commands
npm run dev: Full-stack dev (Vercel CLI).

npm run dev:frontend: Vite only.

npm run db:push: Drizzle/Schema updates (if applicable).

Feature Flags
V1 (Current): Auth, Library, Logging, History, PRs, AI Assistant, Offline.

V2 (Forbidden): Plan Designer, Sharing, Supersets, Calendar.

Testing & Quality
Error Priorities: Data Safety > Degradation > User Feedback.

Pitfalls: Zombie drafts (failed deletes), Client-side DB usage in Server files, Auto-start timers.

Verify: Offline logging → Reconnect → Sync success.