# GymBrAIn V1 Implementation Plan

## Overview
This document serves as a **phase-by-phase instruction manual** for building GymBrAIn V1. Each phase contains detailed implementation steps, code examples, and technical guidance.

**For current project status:** See `PROJECT_STATUS.md`
**For fix history:** See `planchanges.md`
**For technical constraints:** See `CLAUDE.md`
**For feature requirements:** See `GymBrAIn_Specification_v1_2_2_FINAL.md`

**Target:** Production-ready workout tracking PWA with offline-first architecture

## ⚠️ CRITICAL: Project Structure Guidelines

**Backend shared code MUST live in `/api/_lib/`, NOT `/src/lib/`**

This is a Vercel serverless architecture requirement:
- `/src/lib/` = **Client-side utilities only** (shipped to browser)
- `/api/_lib/` = **Server-side utilities only** (backend, never exposed)

**Why this matters:**
1. Vercel serverless functions bundle independently
2. They can only import code within or below `/api` directory
3. Frontend bundles in `/src` are sent to browsers
4. Database credentials, auth secrets MUST NOT be in frontend code

**Correct import patterns:**
```javascript
// ✅ CORRECT - API endpoint importing backend utilities
// /api/exercises.js
import { sql } from './_lib/db.js';
import { requireAuth } from './_lib/middleware/auth.js';

// ✅ CORRECT - Frontend component importing client utilities
// /src/components/WorkoutCard.jsx
import { apiClient } from '@/lib/api.js';
import { formatWeight } from '@/lib/formatters.js';

// ❌ WRONG - Never do this
import { sql } from '../src/lib/db.js'; // Frontend can access this!
```

---

## Phase 1: Project Foundation & Setup

### 1.1 Project Initialization
**Create project structure and install dependencies**

```bash
# Initialize Next.js/React project (or Vite based on preference)
npm create vite@latest . -- --template react
# OR for Next.js if you want built-in API routes
npx create-next-app@latest . --typescript

# Core dependencies
npm install react react-dom react-router-dom
npm install @neondatabase/serverless  # CRITICAL - required for serverless
npm install bcrypt jsonwebtoken
npm install openai
npm install resend  # Email for password reset

# Frontend utilities
npm install axios
npm install date-fns  # Timestamp handling
npm install recharts  # Progress charts

# Development tools
npm install -D eslint prettier
npm install -D @types/node @types/react @types/react-dom
```

**Create folder structure:**
```
/src
  /components       # React UI components
  /pages           # Route-level pages
  /lib             # CLIENT-SIDE ONLY: API wrappers, formatters, constants
  /hooks           # Custom React hooks
/api               # Vercel serverless functions
  /_lib           # **SERVER-SIDE ONLY**: Backend shared code
    db.js         # Database connection
    auth.js       # Auth utilities
    fuzzyMatch.js # Exercise deduplication
    /middleware   # Auth middleware
  /auth           # Auth endpoints
  /workouts       # Workout endpoints
  /exercises      # Exercise endpoints
  /templates      # Template endpoints
  /ai
  /user
/public
  service-worker.js
  manifest.json
  icons/
/docs              # Already exists
```

### 1.2 Vercel CLI Setup
**Install Vercel CLI for local development (REQUIRED)**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Link project to Vercel (optional, only if deploying)
vercel link

# Pull environment variables from Vercel (optional)
vercel env pull .env.local
```

**Why Vercel CLI?**
- Runs both frontend (Vite) and API routes together on `http://localhost:3000`
- Simulates production Vercel environment locally
- Handles serverless function execution correctly
- Required for testing API endpoints during development

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "vercel dev",           // Full-stack dev (recommended)
    "dev:frontend": "vite",         // Frontend only
    "dev:api": "node scripts/test-server.js",  // API only
    "build": "vite build",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

### 1.3 Environment Setup
**Create `.env.local` file (never commit this)**
```env
DATABASE_URL=postgresql://...  # Neon Postgres connection string
JWT_SECRET=random_secret_here
JWT_REFRESH_SECRET=random_refresh_secret_here
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
```

**Create `.env.example` for reference**
```env
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
OPENAI_API_KEY=
RESEND_API_KEY=
```

---

## Phase 2: Database Setup

### 2.1 Database Schema Creation
**Create migration file: `migrations/001_initial_schema.sql`**

Tables to create (in order to handle foreign key constraints):
1. **User** table
2. **PasswordResetToken** table
3. **Exercise** table
4. **Template** table
5. **TemplateExercise** table
6. **Workout** table
7. **WorkoutExercise** table
8. **Set** table
9. **WorkoutDraft** table

**Key schema details:**
- All IDs are UUID (use `gen_random_uuid()` default)
- Weights: `DECIMAL(6,2)` (lbs only)
- Timestamps: `TIMESTAMP WITH TIME ZONE` (UTC storage)
- Arrays for muscle groups: `TEXT[]`
- JSONB for draft data: `JSONB`

**Critical constraints:**
- `User.email` is `NOT NULL` (required for password reset)
- No `sync_status` field in `Workout` table (client-side only)
- No `is_draft` field in `Workout` table (use `WorkoutDraft` table)
- Cascade deletes: `Workout → WorkoutExercise → Set`

### 2.2 Database Indexes
**Add indexes for performance (Section 12.1 of spec):**

```sql
CREATE INDEX idx_workout_user_started ON workout(user_id, started_at DESC);
CREATE INDEX idx_workout_exercise_workout ON workout_exercise(workout_id);
CREATE INDEX idx_workout_exercise_exercise ON workout_exercise(exercise_id);
CREATE INDEX idx_set_workout_exercise ON set(workout_exercise_id);
CREATE INDEX idx_template_user ON template(user_id);
CREATE INDEX idx_template_exercise_template ON template_exercise(template_id);
CREATE INDEX idx_template_exercise_exercise ON template_exercise(exercise_id);
CREATE INDEX idx_exercise_creator ON exercise(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_password_reset_token ON password_reset_token(token);
CREATE INDEX idx_password_reset_user ON password_reset_token(user_id);
CREATE INDEX idx_workout_draft_user ON workout_draft(user_id);
CREATE INDEX idx_workout_draft_expires ON workout_draft(expires_at) WHERE expires_at IS NOT NULL;
```

### 2.3 Exercise Library Seed Data
**Create `migrations/002_seed_exercises.sql`**

Insert 50+ default exercises covering:
- **Chest:** Bench Press, Incline Press, Cable Fly, Dumbbell Fly, Push-Up, Dip
- **Back:** Deadlift, Barbell Row, Lat Pulldown, Pull-Up, Cable Row, T-Bar Row
- **Shoulders:** Overhead Press, Lateral Raise, Front Raise, Face Pull, Reverse Fly
- **Arms:** Barbell Curl, Tricep Pushdown, Hammer Curl, Skull Crusher, etc.
- **Legs:** Squat, Leg Press, Romanian Deadlift, Leg Curl, Hip Thrust, Calf Raise
- **Core:** Plank, Crunch, Leg Raise, Cable Woodchop, Ab Wheel

**Each exercise needs:**
- `type`: weighted | bodyweight | cardio | timed
- `equipment`: barbell | dumbbell | cable | machine | bodyweight | other
- `primary_muscles`: array of muscle groups
- `secondary_muscles`: array of secondary muscles
- `is_custom`: false (for library exercises)
- `is_archived`: false (default)
- `created_by`: null (for library exercises)

### 2.4 Database Connection Module
**Create `api/_lib/db.js`:** (SERVER-SIDE ONLY)

```javascript
import { neon } from '@neondatabase/serverless';

// CRITICAL: Use @neondatabase/serverless driver for Vercel
// This file lives in /api/_lib/ so it's never exposed to client
export const sql = neon(process.env.DATABASE_URL);
```

**Note:** Backend shared code MUST live in `/api/_lib/`, not `/src/lib/`.

---

## Phase 3: Authentication System

### 3.1 Password Hashing Utilities
**Create `api/_lib/auth.js`:** (SERVER-SIDE ONLY)
- `hashPassword(password)` - bcrypt hash
- `verifyPassword(password, hash)` - bcrypt compare
- `generateJWT(userId)` - JWT access token (15 min expiry)
- `generateRefreshToken(userId)` - Refresh token (7-30 days based on "remember me")
- `verifyJWT(token)` - Verify and decode JWT
- `verifyRefreshToken(token)` - Verify refresh token

**Note:** Backend auth utilities MUST live in `/api/_lib/`, not `/src/lib/`.

### 3.2 Auth API Routes

**`/api/auth/register.js`**
- Validate username (3-30 chars, alphanumeric + underscore)
- Validate email (required, valid format)
- Validate password (min 8 chars)
- Check username uniqueness
- Hash password with bcrypt
- Insert User record
- Return JWT + refresh token

**`/api/auth/login.js`**
- Accept username/email + password
- Verify credentials
- Return JWT + refresh token
- Handle "remember me" checkbox (30-day refresh token vs 7-day)

**`/api/auth/refresh.js`**
- Verify refresh token
- Generate new access token
- Return new JWT

**`/api/auth/forgot-password.js`**
- Validate email exists
- Generate reset token (crypto.randomBytes)
- Hash and store in PasswordResetToken table
- Set expires_at to 1 hour from now
- Send email via Resend API with reset link
- Return success (don't reveal if email exists)

**`/api/auth/reset-password.js`**
- Verify token exists and not expired
- Verify token not already used (`used_at IS NULL`)
- Validate new password
- Hash new password
- Update User password_hash
- Mark token as used (`used_at = NOW()`)
- Return success

### 3.3 Auth Middleware
**Create `api/_lib/middleware/auth.js`:** (SERVER-SIDE ONLY)

```javascript
import { verifyJWT } from '../auth.js';

export function requireAuth(handler) {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = verifyJWT(token);
      req.user = decoded;  // Attach user info to request
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
```

---

## Phase 4: Exercise Library API

### 4.1 Exercise Endpoints

**`/api/exercises.js` (GET)**
- Return all exercises where `is_archived = false`
- Include library exercises (created_by IS NULL) and user's custom exercises
- Support query params: `?muscle=chest`, `?equipment=barbell`, `?type=weighted`

**`/api/exercises.js` (POST)**
- Require authentication
- Validate exercise data
- Perform fuzzy string matching against existing exercises (70%+ similarity)
- If matches found, return suggestions: `{ suggestions: [...], proceed: false }`
- If user confirms, create custom exercise with `is_custom = true` and `created_by = user_id`

**`/api/exercises/[id]/archive.js` (PUT)**
- Require authentication
- Check if user created the exercise (custom exercises only)
- Set `is_archived = true`
- Return success

---

## Phase 5: Workout CRUD & Draft System

### 5.1 Workout Endpoints

**`/api/workouts.js` (GET)**
- Require authentication
- Query: `SELECT * FROM workout WHERE user_id = ? ORDER BY started_at DESC LIMIT 50`
- Support pagination with `?offset=N`
- Include workout exercises and sets (join queries)

**`/api/workouts.js` (POST)**
- Require authentication
- Insert workout with started_at, name, user_id
- Return workout ID

**`/api/workouts/[id].js` (PUT)**
- Require authentication
- Verify workout belongs to user
- Update workout fields
- Recalculate total_volume, duration_seconds

**`/api/workouts/[id].js` (DELETE)**
- Require authentication
- Verify workout belongs to user
- Cascade delete WorkoutExercise and Set records
- Delete workout

### 5.2 Draft System

**`/api/workouts/draft.js` (POST)**
- Require authentication
- Upsert WorkoutDraft (insert or update if exists)
- Update `last_synced_at` to NOW()
- Set `expires_at` to 24 hours from NOW()
- Store workout state in `data` JSONB field

**`/api/workouts/draft.js` (GET)**
- Require authentication
- Return current active draft (latest by created_at)
- If expired, delete and return null

**`/api/workouts/draft.js` (DELETE)**
- Require authentication
- Delete draft by ID or user_id

### 5.3 Sync Endpoint (Critical for Offline)

**`/api/workouts/sync.js` (POST)**
- Require authentication
- Accept payload:
  ```json
  {
    "completed_workouts": [{ workout, exercises, sets }],
    "delete_draft_ids": ["draft-uuid-1"]
  }
  ```
- **ATOMIC TRANSACTION:**
  1. Parse each completed workout
  2. Insert into Workout, WorkoutExercise, Set tables
  3. DELETE FROM WorkoutDraft WHERE id IN (delete_draft_ids)
  4. COMMIT transaction
- **Critical:** Must delete drafts to prevent "zombie drafts"
- Return sync confirmation with workout IDs

---

## Phase 6: Template System

### 6.1 Template Endpoints

**`/api/templates.js` (GET)**
- Require authentication
- Query templates for user with exercises joined

**`/api/templates.js` (POST)**
- Require authentication
- Insert Template record
- Insert TemplateExercise records with order_index
- Return template ID

**`/api/templates/[id].js` (PUT)**
- Require authentication
- Verify template belongs to user
- Update template name/description
- Handle exercise reordering (update order_index)
- **CRITICAL:** Normalize order_index after deletion (0, 1, 2, ...)

**`/api/templates/[id].js` (DELETE)**
- Require authentication
- Verify template belongs to user
- Cascade delete TemplateExercise records
- Delete template

**`/api/templates/[id]/exercises.js` (GET)**
- Join TemplateExercise with Exercise table
- Return ordered list with exercise details

---

## Phase 7: Progress & PR Tracking

### 7.1 Progress Endpoints

**`/api/progress/[exerciseId].js` (GET)**
- Require authentication
- Query all sets for exercise across all user's workouts
- Exclude warm-up sets (`is_warmup = false`)
- Return time-series data: `{ date, weight, reps, estimated_1rm }`

**`/api/prs.js` (GET)**
- Require authentication
- Calculate PRs by exercise and rep range (1RM, 3RM, 5RM, 10RM)
- Exclude warm-up sets
- Use Brzycki formula for estimated 1RM: `weight / (1.0278 - 0.0278 * reps)`
- Return: `{ exercise_id, rep_range, max_weight, date, estimated_1rm }`

**`/api/stats/weekly.js` (GET)**
- Require authentication
- Accept `?week=YYYY-MM-DD` (Monday of week)
- Calculate total volume by muscle group
- Return frequency heatmap data

### 7.2 PR Detection Logic (Client-Side)
- When user logs a set, check if it beats current PR
- If `is_warmup = true` and set beats PR, show toast:
  - "This beats your PR! Mark as working set to count it?"
  - Button to toggle `is_warmup = false`

---

## Phase 8: AI Workout Assistant

### 8.1 AI Proxy Endpoint

**`/api/ai/workout-assistant.js` (POST)**
- Require authentication
- Rate limiting: Max 20 requests per workout, 100 per user per day
- Accept payload:
  ```json
  {
    "message": "Should I rest longer?",
    "context": {
      "workout_name": "Push Day",
      "current_exercise": "Bench Press",
      "recent_sets": [{ weight: 225, reps: 8, rir: 2 }],
      "conversation_history": [{ role: "user", content: "..." }]
    }
  }
  ```

### 8.2 OpenAI Integration
- System prompt: Enforce tentative language, safety disclaimers, no prescriptive advice
- Include context: current exercise + last 2-3 sets only (not full workout)
- Timeout: 5 seconds (abort after 5s)
- On timeout/error: Return `{ error: "AI temporarily unavailable. Continue logging normally." }`

### 8.3 Context Window Management
- Maintain last 2-3 message pairs in frontend
- Reset context when workout completes or AI panel closes
- Only send relevant exercise data (currently active exercise)

---

## Phase 9: Frontend React Implementation

### 9.1 Core Pages

**`/src/pages/Workout.jsx`**
- Start blank / from template / resume draft
- Add exercises from library
- Log sets (weight, reps, RIR, warm-up toggle)
- View previous performance (same exercise from last workout)
- Rest timer component
- AI chat panel
- Draft auto-save every 30s
- Complete workout → atomic sync + draft deletion

**`/src/pages/History.jsx`**
- Desktop: Table with Date | Name | Duration | Volume | Exercises
- Mobile: Card-based list (no horizontal scroll)
- Filter by date range, workout name, exercise
- Click to expand workout details

**`/src/pages/Progress.jsx`**
- Exercise selector dropdown
- PR table (1RM, 3RM, 5RM, 10RM with dates)
- Estimated 1RM/3RM charts (Recharts)
- Weekly stats: volume by muscle group, frequency heatmap

**`/src/pages/Library.jsx`**
- Browse exercises by muscle group / equipment
- Search with fuzzy matching
- Filter by type (weighted, bodyweight, cardio, timed)
- Create custom exercise with deduplication
- Archive custom exercises

**`/src/pages/Profile.jsx`**
- Settings (theme preference, display name)
- Password reset request
- JSON export download
- Sync status view

### 9.2 Critical Components

**`/src/components/RestTimer.jsx`**
- Quick-select buttons: 30s, 60s, 90s, 2m, 3m, 5m
- Manual +15s / -15s adjustment
- Countdown display
- **NO AUTO-START** (manual start only)

**`/src/components/SetEntry.jsx`**
- Weight input (0-1500, decimal to 0.1, display rounded to 0.5)
- Reps input (1-100, integer)
- RIR input (0-10, integer)
- Warm-up checkbox
- Notes field
- Previous performance display (grayed out reference)

**`/src/components/AIChatPanel.jsx`**
- Message input
- Conversation history
- Disclaimer (shown once per workout session)
- Loading spinner with 5s timeout
- Offline/unavailable state

**`/src/components/SyncStatusBadge.jsx`**
- Header icon: Green (synced) / Yellow (syncing) / Red (offline) / Orange (failed)
- Per-workout badges: "Local", "Failed", "Conflict"
- Click to open sync detail modal

**`/src/components/ToastNotification.jsx`**
- Types: success, error, warning, info
- PR achievement toasts
- Conflict detection toasts
- Sync failure toasts

### 9.3 Custom Hooks

**`/src/hooks/useNetworkStatus.js`**
- Detect online/offline state
- Listen to `window.addEventListener('online'/'offline')`

**`/src/hooks/useIndexedDB.js`**
- CRUD operations for workouts in IndexedDB
- Sync queue management
- Draft persistence

**`/src/hooks/useDraftAutoSave.js`**
- Auto-save draft every 30s (when online)
- Save to IndexedDB immediately
- Sync to server via `/api/workouts/draft`

**`/src/hooks/useAuth.js`**
- JWT token management (localStorage)
- Auto-refresh token before expiry
- Logout and clear tokens

---

## Phase 10: PWA & Offline Support

### 10.1 Service Worker Setup

**`/public/service-worker.js`**
- Cache-first strategy for static assets (JS, CSS, fonts)
- Network-first for API calls with offline fallback
- Cache exercise library text on install (no images)
- Register sync event for background sync (note: iOS doesn't support this)

**Workbox Configuration:**
```javascript
// Cache static assets
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Network-first for API
workbox.routing.registerRoute(
  /\/api\/.*/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60  // 5 minutes
      })
    ]
  })
);

// Cache-first for exercise library
workbox.routing.registerRoute(
  /\/api\/exercises$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'exercises-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 7 * 24 * 60 * 60  // 1 week
      })
    ]
  })
);
```

### 10.2 IndexedDB Schema

**Create `lib/indexedDB.js`:**

Database: `gymbrainDB`
Object Stores:
1. **workouts** - Completed workouts pending sync
   - Key: UUID
   - Indexes: `user_id`, `sync_status`, `started_at`
   - Fields: workout data + `sync_status` (local | synced | failed)

2. **drafts** - Active workout drafts
   - Key: UUID
   - Indexes: `user_id`, `updated_at`

3. **exercises** - Exercise library cache (text only)
   - Key: UUID
   - Indexes: `name`, `type`, `primary_muscles`

4. **syncQueue** - Pending sync operations
   - Key: auto-increment
   - Fields: `operation`, `payload`, `timestamp`, `retry_count`

### 10.3 Offline Sync Logic

**`lib/syncManager.js`:**

```javascript
// UUID generation for offline records
const generateUUID = () => crypto.randomUUID();

// Save workout offline
async function saveWorkoutOffline(workout) {
  // Generate UUIDs for all records
  workout.id = generateUUID();
  workout.exercises.forEach(ex => {
    ex.id = generateUUID();
    ex.sets.forEach(set => set.id = generateUUID());
  });

  // Save to IndexedDB with sync_status = 'local'
  await db.workouts.add({ ...workout, sync_status: 'local' });

  // Add to sync queue
  await db.syncQueue.add({
    operation: 'create_workout',
    payload: workout,
    timestamp: Date.now(),
    retry_count: 0
  });
}

// Sync queue processor
async function processSyncQueue() {
  const pending = await db.syncQueue.toArray();

  for (const item of pending) {
    try {
      // Exponential backoff
      if (item.retry_count > 3) {
        await markAsFailed(item);
        continue;
      }

      // Attempt sync
      const response = await fetch('/api/workouts/sync', {
        method: 'POST',
        body: JSON.stringify({
          completed_workouts: [item.payload],
          delete_draft_ids: [item.payload.draft_id]
        })
      });

      if (response.ok) {
        // Success - remove from queue
        await db.syncQueue.delete(item.id);
        await db.workouts.update(item.payload.id, { sync_status: 'synced' });
      } else {
        // Retry
        await db.syncQueue.update(item.id, { retry_count: item.retry_count + 1 });
      }
    } catch (error) {
      // Network error - will retry later
      await db.syncQueue.update(item.id, { retry_count: item.retry_count + 1 });
    }
  }
}

// Conflict detection (last-write-wins)
async function detectConflict(localWorkout, serverWorkout) {
  const timeDiff = Math.abs(
    new Date(localWorkout.updated_at) - new Date(serverWorkout.updated_at)
  ) / 1000 / 60;  // minutes

  if (timeDiff > 5) {
    // Show toast warning
    showToast('warning', `Workout updated ${Math.round(timeDiff)} minutes ago on another device. Your changes have been saved.`);
  }
}
```

### 10.4 PWA Manifest

**`/public/manifest.json`:**
```json
{
  "name": "GymBrAIn",
  "short_name": "GymBrAIn",
  "description": "Workout tracking PWA with AI assistance",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#6B8E6B",
  "background_color": "#6B8E6B",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Phase 11: User Data Export

### 11.1 Export Endpoint

**`/api/user/export.js` (GET)**
- Require authentication
- Query all user data:
  - User profile
  - All workouts with exercises and sets
  - All templates with template exercises
  - Custom exercises
  - PRs (calculated)
- Format as single JSON object
- Return with timestamped filename: `gymbrain-export-2026-01-17.json`

---

## Phase 12: UI/UX Polish

### 12.1 Design System Implementation

**Color palette (dark mode default):**
- Primary: Sage Green `#6B8E6B` (light) / `#4A6B4A` (dark)
- Secondary: Terracotta `#C76B4B` (light) / `#8B4A3A` (dark)
- Background: `#F8F6F1` (light) / `#2A2A2A` (dark)
- Surface: `#FFFEF9` (light) / `#3A3A3A` (dark)
- Text: `#3E2723` (light) / `#F5F5DC` (dark)

**Typography:**
- Headings: Inter 600
- Body: Inter 400
- Numbers: JetBrains Mono 500 (for weight/rep displays)

**Responsive breakpoints:**
- Mobile: < 640px (bottom nav, single column, cards)
- Tablet: 640-1024px (side nav, 2-column grids)
- Desktop: > 1024px (side nav, multi-column, tables allowed)

### 12.2 Accessibility
- Minimum contrast ratio: 4.5:1 for text
- Keyboard navigation for all interactive elements
- Screen reader labels on icon buttons
- Focus indicators visible
- Error messages associated with form fields

---

## Phase 13: Testing & Verification

### 13.1 Critical Test Scenarios

**Offline Sync:**
1. Log workout offline → IndexedDB save
2. Reconnect → automatic sync to server
3. Verify draft deletion after workout complete
4. Check for zombie drafts (none should exist)

**Draft System:**
1. Start workout → auto-save draft every 30s
2. Resume draft on different device (when synced)
3. Complete workout → verify draft deleted atomically

**Conflict Detection:**
1. Edit workout on Device A
2. Edit same workout on Device B
3. Sync both → last-write-wins
4. Verify conflict toast appears

**AI Integration:**
1. Test timeout (mock 6s response → should abort at 5s)
2. Test offline AI (should show disabled state)
3. Test rate limiting (21st request rejected)

**Connection Pool:**
1. Rapid API calls (10+ requests in 1 second)
2. Verify no 500 errors from exhausted connections
3. Confirm `@neondatabase/serverless` driver is used

**PR Detection:**
1. Log warm-up set that beats PR
2. Verify toast appears: "This beats your PR! Mark as working set?"
3. Toggle warm-up → verify PR updated

### 13.2 End-to-End Test Flow

**User Journey:**
1. Register account → verify email required
2. Create custom exercise → verify deduplication works
3. Start workout from blank
4. Add exercises, log sets
5. Use rest timer (manual start)
6. Ask AI assistant question (verify context includes current exercise only)
7. Complete workout → verify draft deleted
8. View history → verify mobile uses cards, desktop uses table
9. Check progress charts → verify 1RM calculation
10. Export data as JSON → verify complete data export

### 13.3 Verification Checklist

- [ ] Database uses `@neondatabase/serverless` driver
- [ ] No `sync_status` field in server `Workout` table
- [ ] No `is_draft` field in `Workout` table
- [ ] Weights stored in lbs as `DECIMAL(6,2)`, displayed rounded to 0.5
- [ ] All timestamps in UTC, displayed in user's local timezone
- [ ] Drafts deleted atomically on workout completion
- [ ] OpenAI API key never exposed to client
- [ ] AI requests timeout after 5s
- [ ] Rest timer does not auto-start
- [ ] Exercise images NOT cached offline (text only)
- [ ] Mobile history uses cards (not tables with horizontal scroll)
- [ ] Warm-up sets excluded from PRs, volume, charts
- [ ] Email required for user registration
- [ ] Password reset tokens expire after 1 hour

---

## Critical Files to Modify/Create

### Backend Files
1. `migrations/001_initial_schema.sql` - Database schema
2. `migrations/002_seed_exercises.sql` - Exercise library seed
3. **`api/_lib/db.js`** - Neon database connection (SERVER-SIDE ONLY)
4. **`api/_lib/auth.js`** - Password hashing, JWT utilities (SERVER-SIDE ONLY)
5. **`api/_lib/middleware/auth.js`** - Auth middleware (SERVER-SIDE ONLY)
6. `/api/auth/*.js` - Auth endpoints (register, login, refresh, forgot-password, reset-password)
7. `/api/exercises.js` - Exercise library endpoints
8. `/api/workouts/*.js` - Workout CRUD and sync
9. `/api/templates/*.js` - Template management
10. `/api/progress/*.js` - Progress and PR tracking
11. `/api/ai/workout-assistant.js` - AI proxy
12. `/api/user/export.js` - Data export

### Frontend Files
1. `/src/pages/Workout.jsx` - Active workout logging
2. `/src/pages/History.jsx` - Workout history
3. `/src/pages/Progress.jsx` - Charts and PRs
4. `/src/pages/Library.jsx` - Exercise library
5. `/src/pages/Profile.jsx` - Settings and export
6. `/src/components/RestTimer.jsx` - Rest timer
7. `/src/components/SetEntry.jsx` - Set logging form
8. `/src/components/AIChatPanel.jsx` - AI assistant
9. `/src/components/SyncStatusBadge.jsx` - Sync status
10. `/src/components/ToastNotification.jsx` - Toasts
11. `/src/hooks/useNetworkStatus.js` - Online/offline detection
12. `/src/hooks/useIndexedDB.js` - IndexedDB operations
13. `/src/hooks/useDraftAutoSave.js` - Auto-save logic
14. `/src/hooks/useAuth.js` - Auth state management
15. `/src/lib/indexedDB.js` - IndexedDB schema
16. `/src/lib/syncManager.js` - Offline sync logic

### PWA Files
1. `/public/service-worker.js` - Service Worker
2. `/public/manifest.json` - PWA manifest
3. `/public/icons/icon-192.png` - App icon (192x192)
4. `/public/icons/icon-512.png` - App icon (512x512)

### Configuration Files
1. `.env.local` - Environment variables (don't commit)
2. `.env.example` - Environment template
3. `package.json` - Dependencies
4. `vercel.json` - Vercel deployment config (if needed)

---

## Deployment Checklist

1. **Database:**
   - [ ] Run migrations on Neon Postgres
   - [ ] Verify all indexes created
   - [ ] Seed exercise library

2. **Environment Variables:**
   - [ ] Set `DATABASE_URL` on Vercel
   - [ ] Set `JWT_SECRET` and `JWT_REFRESH_SECRET`
   - [ ] Set `OPENAI_API_KEY`
   - [ ] Set `RESEND_API_KEY`

3. **Vercel Configuration:**
   - [ ] Deploy serverless functions to `/api` routes
   - [ ] Configure build command: `npm run build`
   - [ ] Configure output directory: `dist` or `build`

4. **PWA:**
   - [ ] Verify service worker registered
   - [ ] Test offline functionality
   - [ ] Verify icons and manifest correct

5. **Testing:**
   - [ ] Complete end-to-end test flow
   - [ ] Verify all critical test scenarios pass
   - [ ] Check verification checklist complete

---

## Post-V1 Considerations (V2 Features - Not Implemented Yet)

**V2 features to skip for now:**
- AI workout plan designer
- Plan modification (manual + AI)
- Workout sharing between users
- Frequency calendar
- Quick AI prompt chips
- Superset UI

**V3+ features to skip:**
- Time-boxed programs
- PR celebrations
- Heart rate tracking
- Plate calculator

---

## Summary

This plan provides a complete roadmap for implementing GymBrAIn V1 from scratch. The implementation follows the specifications exactly as defined in `GymBrAIn_Specification_v1_2_2_FINAL.md` and respects all technical constraints from `CLAUDE.md`.

**Key Success Factors:**
1. Use `@neondatabase/serverless` driver for database connections
2. Implement offline-first architecture with IndexedDB
3. Atomic draft deletion on workout completion
4. Client-side sync status tracking (not in server DB)
5. AI proxy with 5s timeout and graceful degradation
6. Manual rest timer (no auto-start)
7. Exercise library text-only offline caching

**Estimated Complexity:**
- **High complexity:** Offline sync logic, draft system, conflict detection
- **Medium complexity:** Database schema, authentication, API endpoints
- **Lower complexity:** UI components, progress charts, data export

The plan is structured to build foundational layers first (database, auth) before tackling complex features (offline sync, AI integration), ensuring a solid base for the production-ready application.
