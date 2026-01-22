# CLAUDE.md - GymBrAIn Project

## Project Context
Full-stack developer building production-ready workout tracking PWA. Portfolio project with 10-20 initial users. Prefer serverless patterns, pragmatic solutions over over-engineering. Focus: reliability, offline-first, clean data modeling.

## Documentation System

This project uses a structured documentation system. **Always read these files in order when starting a new chat:**

### 1. PROJECT_STATUS.md - "Where are we?"
**Purpose:** Single source of truth for project progress
**When to use:**
- First file to read when starting work
- Check which phases are complete vs. in progress
- Understand current blockers and known issues
- See what's been tested

**Update when:** Completing a phase, discovering new blockers, or changing project status

### 2. IMPLEMENTATION_PLAN.md - "How do I build phase X?"
**Purpose:** Phase-by-phase instruction manual with code examples
**When to use:**
- Building a new phase (e.g., "I need to implement Phase 9")
- Understanding technical approach for a feature
- Getting code examples and patterns

**Do NOT update:** This is a static reference document

### 3. planchanges.md - "What did we try and why?"
**Purpose:** Changelog of fixes, architectural decisions, and troubleshooting history
**When to use:**
- Debugging issues (check if we've solved this before)
- Understanding why code is structured a certain way
- Catching up on recent fixes

**Update when:** Making architectural changes, fixing bugs, or trying different approaches

### 4. PHASE_X_SUMMARY.md - "What was built in phase X?"
**Purpose:** Detailed implementation notes for completed phases
**When to use:**
- Understanding how a specific phase was implemented
- Reviewing API contracts and response formats
- Testing completed features

**Update when:** Completing a phase with significant implementation details

### 5. GymBrAIn_Specification_v1_2_2_FINAL.md - "What should we build?"
**Purpose:** Feature requirements and business logic (source of truth)
**When to use:**
- Clarifying feature requirements
- Understanding data models
- Validating implementations against spec

**Do NOT update:** This is the authoritative specification

### Quick Reference
```
New chat? → Read PROJECT_STATUS.md first
Building Phase X? → Read IMPLEMENTATION_PLAN.md Phase X
Debugging? → Check planchanges.md for similar issues
Need details? → Check PHASE_X_SUMMARY.md
Unclear requirements? → Check GymBrAIn_Specification_v1_2_2_FINAL.md
```

## Essential Workflow
1. **UNDERSTAND** → Read spec sections relevant to task
2. **PLAN** → Identify database, API, and UI layers affected
3. **IMPLEMENT** → Server logic first, then client integration
4. **VALIDATE** → Test offline scenarios, check sync behavior

## Git Commit Rules
**NEVER commit or push without explicit approval.**
Always describe changes and ask for confirmation before any git operation.

## Tech Stack
- **Frontend:** React (hooks, functional components)
- **Backend:** Node.js/Express on Vercel serverless functions
- **Database:** PostgreSQL via Neon (`@neondatabase/serverless` driver - **REQUIRED**)
- **Auth:** JWT with refresh tokens, bcrypt password hashing
- **AI:** OpenAI GPT-4o-mini (server-side proxy only, 5s timeout)
- **PWA:** Service Worker + IndexedDB for offline support
- **Email:** Resend (password reset only)

## Project Structure
```
/src
  /components       # React UI components
  /pages           # Route-level page components
  /lib             # CLIENT-SIDE ONLY: API wrappers, formatters, constants
  /hooks           # Custom React hooks
/api               # Vercel serverless API routes
  /_lib           # **SERVER-SIDE ONLY**: Backend shared code
    db.js         # Database connection (Neon driver)
    auth.js       # Auth utilities (JWT, bcrypt, validation)
    fuzzyMatch.js # Exercise deduplication logic
    /middleware   # Auth middleware (requireAuth, optionalAuth)
  /auth           # Login, register, password reset
  /workouts       # CRUD, sync, draft endpoints
  /exercises      # Exercise library management
  /progress       # Exercise progression tracking
  /prs            # Personal records calculation
  /stats          # Weekly stats and volume breakdown
  /ai             # AI assistant proxy
/public
  /service-worker.js  # PWA offline logic
docs/
  GymBrAIn_Specification_v1_2_2_FINAL.md  # **Source of truth**
```

**CRITICAL SEPARATION:**
- `/src/lib/` = Client-side utilities (shipped to browser)
- `/api/_lib/` = Server-side utilities (backend only, NEVER exposed to client)
- **NEVER** import from `/api/_lib/` in `/src/` code
- **NEVER** put database/auth code in `/src/lib/`

## Core Commands

### Production Development (Recommended)
```bash
npm run dev          # Start full-stack dev server (Vercel CLI)
                     # Frontend: http://localhost:3000
                     # API: http://localhost:3000/api/*
```

### Alternative Development Modes
```bash
npm run dev:frontend # Vite only (frontend without API)
npm run dev:api      # Test server for API only (port 3001)
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Jest unit tests
```

### Deployment
```bash
vercel deploy        # Deploy to Vercel
```

### Local Development Setup (First Time)
```bash
# 1. Install Vercel CLI globally (one-time)
npm install -g vercel

# 2. Link project to Vercel (optional, for deployment)
vercel link

# 3. Pull environment variables from Vercel (optional)
vercel env pull .env.local

# 4. Start development
npm run dev
```

**IMPORTANT:** Always use `npm run dev` (Vercel CLI) for full-stack development. This ensures API routes work correctly in local environment, matching production behavior.

## Critical Technical Constraints

### 1. Database Connection Pooling
**USE `@neondatabase/serverless` DRIVER ONLY**
```javascript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
```
**Why:** Vercel serverless functions spin up/down rapidly. Standard pg drivers exhaust connection pools, causing 500 errors. This driver has built-in pooling.

### 2. Offline-First Architecture
- All workout operations must work without network
- IndexedDB is the source of truth when offline
- Sync conflicts use **last-write-wins** with user notification
- **iOS caveat:** No background sync - only syncs when app is open
- Exercise images **NOT cached offline** (text-only to prevent storage bloat)

### 3. Data Integrity Rules
- **Weights:** Always stored in pounds (lbs), displayed rounded to nearest 0.5
- **Precision:** Use `DECIMAL(6,2)` for weights, `DECIMAL(10,2)` for volume
- **Timestamps:** Store in UTC, display in user's local timezone
- **UUIDs:** Generate client-side for offline records to prevent ID conflicts on sync

### 4. Workout Draft System
**Critical:** When completing a workout, the `WorkoutDraft` must be atomically deleted
```javascript
// Transaction order:
1. Insert into Workout, WorkoutExercise, Set tables
2. DELETE FROM WorkoutDraft WHERE id = ?
3. Commit transaction
```
**Why:** Prevents "zombie drafts" from appearing as active workouts after completion.

### 5. AI Integration Guardrails
- **Never** expose OpenAI API key to client
- All AI requests timeout after 5 seconds
- App must be fully functional without AI (graceful degradation)
- AI context window: current exercise + last 3 sets only (not full workout history)

## Security Requirements
- **Never commit:** API keys, DATABASE_URL, JWT secrets
- Password reset tokens expire after 1 hour
- Email is **required** for all accounts (no recovery without it)
- Use parameterized queries for all database operations

## Data Model Quick Reference

### Core Tables
- **User** → username (unique), email (**required**), password_hash
- **Exercise** → name, muscle groups, type (strength/cardio), equipment
- **Workout** → user_id, completed_at (UTC), name
  - **Note:** No `is_draft` field - drafts live in separate table
- **WorkoutDraft** → user_id, data (JSONB blob), updated_at
  - Syncs to server every 30s when online
  - Deleted on workout completion
- **Set** → workout_exercise_id, weight (lbs), reps, rir, is_warmup
- **Template** → user_id, name
- **TemplateExercise** → template_id, exercise_id, order_index

### Critical Relationships
- Workout → WorkoutExercise → Set (cascade deletes)
- Template → TemplateExercise → Exercise (normalized, not JSON)
- Exercise edits are **retroactive** (no snapshot history)

## Offline Sync Behavior

### Normal Flow
1. User makes changes → saved to IndexedDB
2. Every 30s (if online): draft syncs to server
3. On workout complete: permanent sync to `Workout` table + draft deletion
4. Sync failures tracked client-side (not in server DB)

### Conflict Resolution
- **Strategy:** Last-write-wins
- **Detection:** Compare `updated_at` timestamps
- **UI:** Show toast notification if conflict detected
- **User control:** No manual merge - simply inform user

### Sync Failure Recovery
If sync fails permanently:
1. Show "Sync failed" badge in UI
2. User options: "Retry" or "Discard" (with warning)
3. Discarded workouts remain in IndexedDB for 30-day recovery window
4. **Never** silently drop user data

## Common Patterns

### API Route Structure
```javascript
// /api/workouts/[id].js
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

async function handleGet(req, res) {
  const userId = req.user.userId; // From requireAuth middleware

  // Database operation using shared sql instance
  const workout = await sql`
    SELECT * FROM workout
    WHERE id = ${req.query.id} AND user_id = ${userId}
  `;

  return res.status(200).json({ workout: workout[0] });
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return requireAuth(handleGet)(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
```

**IMPORTANT:** Always import from `./_lib/` (or `../_lib/` depending on depth) within `/api` directory. Never use absolute paths or import from `/src/lib/`.

### Offline-Compatible Components
```javascript
// Always check online status
const { isOnline } = useNetworkStatus();

// Save to IndexedDB first, then attempt server sync
await saveToIndexedDB(workout);
if (isOnline) {
  try {
    await syncToServer(workout);
  } catch (e) {
    markAsSyncFailed(workout);
  }
}
```

### Form Validation
```javascript
// Weight input: 0-1500 lbs, round to 0.5
const roundToHalf = (num) => Math.round(num * 2) / 2;

// Reps: 1-100 integer
// RIR: 0-10 integer
// Duration: positive seconds
```

## Feature Flags (Version Gating)

### V1 (Current)
✅ Auth with password reset  
✅ Exercise library  
✅ Workout logging + templates  
✅ History views + progress charts  
✅ PR tracking  
✅ AI workout assistant  
✅ Rest timer  
✅ JSON export  
✅ PWA/offline  

### V2 (Future)
🚫 AI workout plan designer  
🚫 Plan modification  
🚫 Workout sharing  
🚫 Frequency calendar  
🚫 Superset UI  

**Do not implement V2 features unless explicitly requested.**

## UI/UX Guidelines
- **Mobile-first:** Cards for history view, tables for desktop
- **Dark mode:** Default theme, no light mode toggle in V1
- **Rest timer:** Manual start (no auto-start)
- **AI disclaimer:** Show once per session (localStorage flag)
- **Toasts:** Use for PR achievements, conflict warnings, sync failures
- **Loading states:** Show skeleton screens, not spinners

## Exercise Library Rules
- **Default library:** 50+ exercises seeded on DB init
- **Custom exercises:** Users can create, but not edit defaults
- **Archive, not delete:** Soft delete with `is_archived` flag
- **Type vs Equipment:** Squat is a "strength" type using "barbell" equipment
- **Bodyweight limitation:** Volume calculations estimate 150 lbs (for trends only, not precision)

## Error Handling Priorities
1. **Never lose user data** (sync failures preserved in IndexedDB)
2. **Graceful degradation** (app works without AI/images/network)
3. **Clear user feedback** (toasts, badges, recovery options)
4. **Retry mechanisms** (exponential backoff for sync)

## Testing Focus Areas
- [ ] Offline workout logging → reconnect → successful sync
- [ ] Draft deletion on workout completion (prevent zombie drafts)
- [ ] Connection pool exhaustion (rapid API calls)
- [ ] Sync conflict detection (simultaneous edits on different devices)
- [ ] AI timeout fallback (5s limit)
- [ ] Password reset email delivery

## Common Pitfalls to Avoid
❌ Using `sync_status` field in server `Workout` table (removed in v1.2.2)  
❌ Storing drafts as `Workout.is_draft = true` (use `WorkoutDraft` table)  
❌ Caching exercise images offline (text-only policy)  
❌ Auto-starting rest timer (requires manual trigger)  
❌ Exposing OpenAI API key to client  
❌ Using standard `pg` driver (must use `@neondatabase/serverless`)  

## Performance Considerations
- Index on `(user_id, completed_at DESC)` for workout queries
- Index on `(workout_exercise_id, set_number)` for set ordering
- Partial index on failed sync status (if implemented client-side)
- Lazy-load history beyond 30 days (pagination)
- AI context limited to current exercise + last 3 sets

## When in Doubt
1. **Check the spec:** `docs/GymBrAIn_Specification_v1_2_2_FINAL.md` is authoritative
2. **Simplicity first:** Avoid premature optimization for 10-20 users
3. **Offline-first:** If it breaks offline, it's wrong
4. **Data safety:** When sync conflicts arise, preserve both versions in IndexedDB

---

**Last Updated:** January 2026 (Spec v1.2.2 - FINAL)
