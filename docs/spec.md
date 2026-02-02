# GymBrAIn
## Product Specification Document

**Version 1.2.2 - FINAL**  
**January 2026**

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technical Architecture](#2-technical-architecture)
3. [Data Models](#3-data-models)
4. [Feature Specifications - V1](#4-feature-specifications---v1)
5. [Feature Specifications - V2](#5-feature-specifications---v2)
6. [User Interface Specifications](#6-user-interface-specifications)
7. [AI Integration](#7-ai-integration)
8. [Design System](#8-design-system)
9. [Error Handling & Recovery](#9-error-handling--recovery)
10. [PWA & Offline Support](#10-pwa--offline-support)
11. [Exercise Library](#11-exercise-library)
12. [Database Performance](#12-database-performance)
- [Appendix A: Input Validation Rules](#appendix-a-input-validation-rules)
- [Appendix B: API Endpoints](#appendix-b-api-endpoints)
- [Appendix C: Changelog](#appendix-c-changelog)

---

# 1. Executive Summary

## 1.1 Product Overview

GymBrAIn is a personal workout tracking and planning application designed as a portfolio and learning project for production-quality web application development. The application enables users to log workouts, track exercise progression, view historical data, and receive AI-powered assistance during workouts. A secondary feature (V2) includes an AI-driven workout plan designer.

**Initial user base:** 10-20 people  
**Architecture goal:** Production-ready patterns suitable for scaling

## 1.2 Core Value Propositions

- Track workout history with detailed set, rep, and weight logging
- View previous performance during workouts for progressive overload guidance
- AI assistant for real-time workout questions and exercise alternatives
- Visual progress tracking with estimated 1RM/3RM charts and PR tracking
- Offline-capable PWA for reliable gym use
- AI-generated personalized workout plans (V2)

## 1.3 Version Roadmap

| Version | Features |
|---------|----------|
| **V1** | User auth (with password reset), exercise library, workout logging, templates, history views, progress charts, PR tracking, AI workout assistant, rest timer, JSON export, PWA/offline, dark mode |
| **V2** | AI workout plan designer, plan modification (manual + AI), workout sharing between users, frequency calendar, quick AI prompt chips, superset UI |
| **V3+** | Time-boxed programs, PR celebrations, heart rate tracking, plate calculator |

---

# 2. Technical Architecture

## 2.1 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React | Most familiar for troubleshooting |
| Backend | Node.js / Express | API routes and business logic |
| Database | PostgreSQL (Neon) | Serverless Postgres, avoid Supabase |
| Database Driver | @neondatabase/serverless | **REQUIRED** for serverless connection pooling |
| Hosting | Vercel | Frontend + serverless functions |
| AI | OpenAI GPT-4o-mini | Shared API key, server-side only |
| PWA | Service Worker + IndexedDB | Offline support with sync |
| Email | Resend or similar | For password reset emails |

### 2.1.1 Critical: Neon Connection Pooling

**Problem:** Vercel serverless functions spin up and down rapidly. Without proper connection pooling, users clicking around quickly can exhaust the database connection pool, causing 500 errors.

**Solution:** Use `@neondatabase/serverless` driver with built-in connection pooling:

```javascript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
```

This driver is optimized for serverless environments and prevents connection exhaustion.

## 2.2 Authentication

- Simple username/password authentication
- Passwords hashed with bcrypt
- JWT tokens for session management
- Refresh token for extended sessions
- No OAuth required - small trusted user base
- **Email is REQUIRED** for all accounts (needed for password reset)

### Password Reset Flow
1. User enters email on "Forgot Password" screen
2. Server generates time-limited reset token (1 hour expiry)
3. Email sent with reset link containing token
4. User clicks link, enters new password
5. Token invalidated after use

**Note:** Accounts without email cannot reset passwords. Email field is mandatory during registration.

## 2.3 API Key Security

The OpenAI API key is stored as an environment variable on Vercel and accessed only through server-side API routes. The key is never exposed to the client. All AI requests are proxied through the backend.

### AI Timeout & Fallback
- AI requests timeout after 5 seconds
- On timeout or error, show: "AI assistant temporarily unavailable. You can continue logging your workout normally."
- All workouts must be fully usable without AI functionality

## 2.4 Unit Storage Standard

**All weights are stored in the database in pounds (lbs).**

- User preference for units has been removed (imperial only)
- All weight inputs and displays are in pounds
- Decimal precision: weights stored as `DECIMAL(6,2)` (supports 0-9999.99 lbs)
- Display rounding: always round to nearest 0.5 lbs for consistency

**Example:** User enters 225.3 lbs → stored as 225.30 → displayed as 225.5 lbs

## 2.5 Numeric Precision Standards

All numeric fields follow these precision rules:

| Field | Storage Type | Display Rounding | Range |
|-------|-------------|------------------|-------|
| Weight | DECIMAL(6,2) | Nearest 0.5 lbs | 0-9999.99 |
| Reps | INTEGER | None | 1-100 |
| RIR | INTEGER | None | 0-10 |
| Duration | INTEGER (seconds) | None | 0-86400 |
| Distance | DECIMAL(6,2) | Nearest 0.1 | 0-9999.99 |
| Total Volume | DECIMAL(10,2) | Nearest 1.0 | Calculated |

## 2.6 Offline Architecture

The application is built as a Progressive Web App (PWA) with full offline support:

- Service Worker caches app shell, static assets, and exercise library (text only)
- IndexedDB stores workout data locally during offline sessions
- **Important: iOS does not support background sync** - data syncs only when app is open
- Last-write-wins conflict resolution with detection
- Visible sync status indicators (see Section 9.3)
- Active workout drafts sync to server every 30 seconds when online

### 2.6.1 Offline Image Caching Policy

**Exercise Library Caching:**
- Text-only exercise data is cached offline (names, muscle groups, equipment)
- Exercise demonstration images/GIFs are **NOT** cached to prevent storage bloat
- When offline, exercise library shows text descriptions only
- When online, images load normally

**Rationale:** Caching all exercise media could consume 50-100MB on mobile devices, hitting browser storage quotas and degrading performance.

### 2.6.2 Offline Auth Handling
- If JWT expires while offline, user can continue logging workouts locally
- On reconnect, app attempts silent token refresh
- If refresh fails, user is prompted to re-login
- **Local data is always preserved** - never lost due to auth issues

### 2.6.3 Active Workout Draft Persistence

**Server-Side Draft Sync:**
- Active workout drafts save to server every 30 seconds (when online)
- Enables resuming workouts across devices
- Draft endpoint: `POST /api/workouts/draft`
- Draft is replaced by completed workout on finish
- **CRITICAL:** When a workout is completed and synced, the corresponding `WorkoutDraft` record MUST be deleted to prevent "zombie drafts"

**Local-Only Fallback:**
- When offline, draft exists only in IndexedDB
- Cannot resume on another device until reconnect
- Warning shown: "Draft saved locally. Reconnect to sync across devices."

**Draft-to-Workout Transition:**
When user completes a workout:
1. Parse `WorkoutDraft.data` JSONB blob
2. Insert permanent rows into `Workout`, `WorkoutExercise`, and `Set` tables (atomic transaction)
3. Delete the `WorkoutDraft` record
4. If sync fails, retry includes draft deletion

---

# 3. Data Models

## 3.1 User

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| username | String | Unique, used for login |
| email | String | **REQUIRED** for password reset |
| password_hash | String | Bcrypt hashed password |
| display_name | String | Shown in UI greeting |
| theme_preference | Enum | system \| light \| dark |
| created_at | Timestamp | Account creation date |

**Migration from v1.1:** `unit_preference` field removed (imperial only), `email` is now required (NOT NULL).

## 3.2 PasswordResetToken

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| token | String | Unique reset token (hashed) |
| expires_at | Timestamp | Token expiration (1 hour from creation) |
| used_at | Timestamp, nullable | When token was used (null if unused) |

## 3.3 Exercise

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Exercise name |
| type | Enum | weighted \| bodyweight \| cardio \| timed |
| equipment | Enum | barbell \| dumbbell \| cable \| machine \| bodyweight \| other |
| primary_muscles | Array | Primary muscle groups targeted |
| secondary_muscles | Array | Secondary muscle groups |
| is_custom | Boolean | True if user-created |
| is_archived | Boolean | Soft delete flag (default false) |
| created_by | UUID \| null | User ID if custom exercise |

**Note:** Exercises are never hard-deleted. Setting `is_archived = true` hides them from the library while preserving historical workout references.

### 3.3.1 Exercise Type Clarification

The `type` field describes the **logging method**, not the physiological category:

| Type | Description | Examples |
|------|-------------|----------|
| weighted | Requires weight input | Bench Press, Squat, Weighted Dips |
| bodyweight | No weight input (may use bodyweight in volume calc) | Pull-ups, Push-ups, Unweighted Dips |
| cardio | Distance/duration tracking | Running, Rowing, Cycling |
| timed | Duration only (no reps/distance) | Plank, Dead Hang, Farmer Carry |

**Edge Cases:**
- Bodyweight + added load (weighted dips/pull-ups): `type = weighted`, `equipment = bodyweight`
- Cardio on machine: `type = cardio`, `equipment = machine`
- Timed + weighted (farmer carry): `type = timed`, note weight in set notes

## 3.4 Workout

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| name | String | Workout name (user-provided or from template) |
| started_at | Timestamp (UTC) | Workout start time |
| completed_at | Timestamp (UTC) | Workout end time |
| duration_seconds | Integer | Calculated duration |
| total_volume | Decimal(10,2) | Sum of (weight × reps) for working sets only |
| notes | Text \| null | Optional workout-level notes |
| template_id | UUID \| null | Source template if applicable |

**IMPORTANT:** This table stores **completed** workouts only. Active/in-progress workouts are stored in the `WorkoutDraft` table (Section 3.9). The `is_draft` field from v1.2 has been removed to prevent schema conflict.

**Note on Sync Status:** The `sync_status` field does NOT exist in the server schema. Sync tracking is a client-side concern managed in IndexedDB. If a workout exists in this table, it has been successfully synced by definition.

**Note:** `total_volume` is labeled "Estimated Volume" in the UI and excludes warm-up sets.

**Timestamp Storage:** All timestamps are stored in UTC and converted to the user's local timezone only for display and aggregation (e.g., weekly stats, calendar views).

### 3.4.1 Volume Calculation Rules

Volume is calculated **only** for:
- Weighted exercises (`type = weighted`)
- Bodyweight exercises with estimated bodyweight (`type = bodyweight` - uses 150 lbs default)
- Working sets only (`is_warmup = false`)

Volume **excludes**:
- Cardio exercises
- Timed exercises
- Warm-up sets

Formula: `SUM(weight × reps)` where `is_warmup = false` and `type IN ('weighted', 'bodyweight')`

**Rationale:** This provides a standardized metric for workout intensity while avoiding meaningless calculations for cardio/timed work.

**Important Limitation:** Bodyweight volume uses a fixed 150 lbs estimate and is intended for **trend comparison only**, not absolute accuracy. Smaller users will see inflated volume; larger users will see deflated volume. This limitation should be communicated in UI copy as: "Bodyweight volume uses a fixed estimate and is intended for trend comparison only."

## 3.5 WorkoutExercise

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workout_id | UUID | Foreign key to Workout |
| exercise_id | UUID | Foreign key to Exercise |
| order_index | Integer | Position in workout |
| superset_id | UUID \| null | Groups exercises for superset display (V2 UI) |
| is_completed | Boolean | All sets completed |

**Note:** `superset_id` is included for future superset support. If two exercises share the same `superset_id`, they will be rendered as a superset group in V2. For V1, this field is unused.

## 3.6 Set

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workout_exercise_id | UUID | Foreign key to WorkoutExercise |
| set_number | Integer | Order within exercise (1, 2, 3...) |
| weight | Decimal(6,2) \| null | Weight in lbs (null for bodyweight/timed) |
| reps | Integer \| null | Repetitions (null for cardio/timed) |
| rir | Integer \| null | Reps in Reserve (0-10) |
| duration_seconds | Integer \| null | For cardio/timed exercises |
| distance | Decimal(6,2) \| null | For cardio exercises |
| notes | Text \| null | Optional set-level notes |
| is_warmup | Boolean | Warm-up set flag (default false) |
| is_completed | Boolean | Set has been logged |

**Note:** Warm-up sets (`is_warmup = true`) are excluded from:
- PR calculations
- Estimated 1RM calculations
- Total volume calculations
- Progress chart data points

## 3.7 Template

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| name | String | Template name |
| description | Text \| null | Optional description |
| created_at | Timestamp | Creation date |
| updated_at | Timestamp | Last modification date |

## 3.8 TemplateExercise

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| template_id | UUID | Foreign key to Template |
| exercise_id | UUID | Foreign key to Exercise |
| order_index | Integer | Position in template (0-based, sequential) |
| target_sets | Integer | Suggested number of sets |
| target_reps | String \| null | Suggested reps (e.g., "8-12", "AMRAP") |
| notes | Text \| null | Exercise-specific instructions |

**Order Index Maintenance:**
When an exercise is deleted from a template, the backend MUST re-normalize `order_index` values to ensure a continuous sequence (0, 1, 2, ...). This prevents gaps that can break drag-and-drop UI libraries.

**Example:**
- Before deletion: [0, 1, 2, 3, 4]
- Delete index 2: [0, 1, 3, 4]
- After normalization: [0, 1, 2, 3]

**Rationale for Normalized Structure:** This enables:
- Querying which templates use a specific exercise
- Showing warnings when archiving exercises in use
- Updating exercise references across all templates
- Future features like "Templates using this exercise: 3"

## 3.9 WorkoutDraft

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| name | String | Draft workout name |
| data | JSONB | Serialized workout state (exercises, sets, notes) |
| last_synced_at | Timestamp | Last server sync |
| created_at | Timestamp | Draft creation time |
| expires_at | Timestamp | Auto-delete after 24 hours of inactivity |

**Purpose:** Stores active/in-progress workouts for cross-device resume. This is a temporary table - drafts are deleted when workout is completed or abandoned.

**Data Structure (JSONB):**
```json
{
  "workout_name": "Push Day",
  "started_at": "2026-01-17T14:30:00Z",
  "exercises": [
    {
      "exercise_id": "uuid",
      "order_index": 0,
      "sets": [
        {
          "set_number": 1,
          "weight": 225,
          "reps": 8,
          "rir": 2,
          "is_warmup": false,
          "is_completed": true
        }
      ]
    }
  ],
  "notes": "Felt strong today"
}
```

**Lifecycle:**
1. Created when user starts a workout
2. Updated every 30 seconds while workout is active (if online)
3. Deleted when workout is completed and synced to `Workout` table
4. Auto-deleted after 24 hours of inactivity (with 4-hour warning)

---

# 4. Feature Specifications - V1

## 4.1 User Authentication

### Registration
- Username (3-30 chars, alphanumeric + underscore)
- Email (**required**, validated)
- Password (minimum 8 chars)
- Display name
- Theme preference (system, light, dark)

### Login
- Username/email + password
- Returns JWT access token (15 min expiry) + refresh token (7 days)
- "Remember me" checkbox extends refresh token to 30 days

### Password Reset
- User enters email
- System sends reset link (1 hour validity)
- Link contains unique token
- User sets new password
- Old token invalidated

## 4.2 Exercise Library

### Core Functionality
- Browse exercises by muscle group or equipment
- Search by name (fuzzy matching)
- Filter by type (weighted, bodyweight, cardio, timed)
- View exercise details (muscles worked, equipment)
- Create custom exercises
- Archive exercises (soft delete)

### Custom Exercise Deduplication
When creating custom exercises:
1. System performs fuzzy string matching against existing exercises
2. If similarity > 70%, show "Did you mean...?" with top 3 matches
3. User can select existing exercise or proceed with custom creation
4. Custom exercises are private to the user who created them

### Admin Exercise Management
- Admin (manual DB access) can archive library exercises
- **No admin UI exists in V1** - all admin operations performed via direct database access
- Archived exercises hidden from library but preserved in history
- Before archiving, can query: `SELECT COUNT(*) FROM template_exercise WHERE exercise_id = ?` to check usage

## 4.3 Workout Logging

### Starting a Workout
- Start from blank
- Start from template
- Quick restart of last workout
- Draft resumes automatically if exists (synced from server or local)

### During Workout
- Add exercises from library
- Reorder exercises (drag-and-drop on desktop, buttons on mobile)
- Log sets (weight, reps, RIR)
- Mark sets as warm-up
- View previous performance for current exercise
- Add notes (workout-level and set-level)
- Timer auto-starts on set completion (configurable)
- Pause/resume timer manually
- **Draft auto-saves every 30 seconds** (to server if online, IndexedDB if offline)

### 4.3.1 Rest Timer Behavior

**Default Behavior:**
- Timer does NOT auto-start when set is marked complete
- User must manually start timer via "Start Rest Timer" button
- Timer shows quick-select buttons: 30s, 60s, 90s, 2m, 3m, 5m
- Manual adjustment available: +15s / -15s buttons

**Rationale:** Users often log sets 30-60 seconds after completing them. Auto-starting the timer would make it incorrect by default. Manual control gives users flexibility.

**Optional Enhancement:** Add a "Set completed X seconds ago" button that back-calculates timer start.

### Completing a Workout
- Auto-calculates duration and total volume
- Shows summary: exercises completed, total sets, volume, PRs hit
- Prompts for workout-level notes
- Converts draft to permanent workout (atomic transaction):
  1. Parse `WorkoutDraft.data` JSONB
  2. Insert rows into `Workout`, `WorkoutExercise`, `Set` tables
  3. Delete `WorkoutDraft` record
- Syncs to server (or queues if offline)

### 4.3.2 Draft Sync Behavior

**When Online:**
- Draft saves to server every 30 seconds
- Manual "Save Draft" button available
- Can resume draft on any device
- **CRITICAL:** When workout is completed, sync request includes instruction to delete the `WorkoutDraft` record

**When Offline:**
- Draft saves to IndexedDB immediately
- Warning shown: "Draft saved locally. Reconnect to sync across devices."
- On reconnect, local draft syncs to server

**Draft Expiry:**
- Server drafts auto-delete after 24 hours of inactivity
- User receives warning at 20 hours: "Your draft will expire in 4 hours"

**Preventing Zombie Drafts:**
When syncing a completed workout, the API request includes:
```javascript
POST /api/workouts/sync
{
  completed_workouts: [{...}],
  delete_draft_ids: ["draft-uuid-1"]
}
```

The server MUST delete the corresponding `WorkoutDraft` record to prevent users seeing "Resume workout?" for already-completed workouts.

## 4.4 Templates

Templates allow users to save workout structures for reuse.

### Template Creation
- Create from current/completed workout
- Create from scratch
- Name + optional description
- List of exercises with suggested sets/reps

### Template Usage
- Browse saved templates
- One-click start workout from template
- Template data pre-fills workout but can be edited

### Template Management
- Edit template (add/remove exercises, change order)
- Delete template (soft delete, preserves history)
- Duplicate template
- **Order Index Normalization:** When an exercise is deleted, backend re-normalizes `order_index` to maintain sequential values (0, 1, 2, ...) for drag-and-drop compatibility

## 4.5 History & Progress

### Workout History
**Desktop View:**
- Table format: Date | Workout Name | Duration | Volume | Exercises
- Click workout to expand and view all sets
- Filter by date range, workout name, or exercise

**Mobile View:**
- Card-based list (NOT table columns)
- Each card shows: Workout Name (top left), Date (top right), Duration + Volume (bottom)
- Tap to expand full workout details

**Rationale:** Tables with horizontal scrolling violate Section 6.4. Cards are more mobile-friendly.

### Exercise History
- View all workouts containing a specific exercise
- Chart showing progression (weight × reps over time)
- Estimated 1RM and 3RM progression charts
- Personal Records table

### Personal Records (PRs)
- Max weight for common rep ranges (1RM, 3RM, 5RM, 10RM)
- Date achieved
- Estimated 1RM calculation (Brzycki formula)
- Historical PR tracking (when was previous PR?)

### 4.5.1 Warm-up Set PR Detection

If a user logs a warm-up set that exceeds their current PR:
1. Toast notification appears: "This beats your PR! Mark as working set to count it?"
2. One-tap button to toggle `is_warmup = false`
3. PR recalculates if user accepts

**Rationale:** Users sometimes discover they're stronger than expected during warm-ups, or forget to uncheck the warm-up flag.

### Weekly Stats
- Total volume per muscle group
- Frequency heatmap (which muscle groups worked which days)
- Week defined as Monday-Sunday in user's local timezone

## 4.6 AI Workout Assistant

### Availability
- Available during active workouts only
- Requires internet connection
- Fallback UI if offline or AI unavailable

### Capabilities
- Answer workout-related questions
- Suggest exercise alternatives (if equipment unavailable)
- Provide form tips
- Recommend rest times based on exercise type
- **Cannot** write workout plans (this is V2 feature)

### Context Window
- System maintains last 2-3 message pairs within current workout
- Context includes: current workout name, **currently active exercise** (if applicable), last 2-3 sets of the active exercise
- If user just started a new exercise, context includes last 2-3 sets of the previous exercise
- Context resets when workout completes

**Rationale:** Sending sets from 5 exercises ago is irrelevant token usage. Focus on the exercise the user is currently working on.

### Disclaimers
- Disclaimer shown once per workout session (not per message)
- Dismissible via info icon in AI panel
- Text: "AI responses are for informational purposes only. Consult a qualified trainer for personalized advice. Always prioritize proper form and safety."

## 4.7 Data Export

Users can export all personal data as JSON:
- User profile
- All workouts (with sets, exercises, notes)
- Templates
- Custom exercises
- PRs and progress data

**Endpoint:** `GET /api/user/export`  
**Format:** Single JSON file, timestamped filename

---

# 5. Feature Specifications - V2

## 5.1 AI Workout Plan Designer

### Plan Creation
- AI generates multi-week workout plans based on:
  - User goals (strength, hypertrophy, endurance)
  - Available equipment
  - Training frequency (days per week)
  - Experience level
  - Injury restrictions

### Plan Structure
- Plan = collection of Templates with scheduling
- Each week has assigned workouts
- Progression built-in (weight/volume increases)

### Plan Modification
- Edit AI-generated plan manually
- Request AI adjustments ("More volume for chest")
- Swap exercises while maintaining plan structure

## 5.2 Workout Sharing

- Share templates between users
- View shared workout history (read-only)
- Copy shared templates to personal library
- Optional: comment on shared workouts

## 5.3 Frequency Calendar

- Visual calendar showing training frequency
- Color-coded by muscle groups
- Click date to view workout details
- Identify rest days and overtraining patterns

## 5.4 Quick AI Prompt Chips

- Pre-written common questions as clickable chips
- Example chips:
  - "Suggest an alternative for this exercise"
  - "How long should I rest?"
  - "Is my volume too high?"
  - "Rate my workout intensity"

## 5.5 Superset UI

- Visual grouping of superset exercises
- Linked timer (rest after both exercises complete)
- Set navigation shows "1A, 1B, 2A, 2B" pattern
- Uses existing `superset_id` field in WorkoutExercise

---

# 6. User Interface Specifications

## 6.1 Navigation

### Primary Navigation (Persistent Bottom Bar on Mobile)
- **Workout** (home)
- **History**
- **Progress**
- **Library**
- **Profile**

### Desktop Navigation
- Sidebar on left
- Same 5 primary sections
- Collapsible for more screen space

## 6.2 Color Palette (Earthy Theme)

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Primary | Sage Green (#6B8E6B) | Muted Green (#4A6B4A) |
| Secondary | Warm Terracotta (#C76B4B) | Deep Terra (#8B4A3A) |
| Background | Off-White (#F8F6F1) | Charcoal (#2A2A2A) |
| Surface | Light Cream (#FFFEF9) | Dark Gray (#3A3A3A) |
| Text Primary | Dark Brown (#3E2723) | Light Cream (#F5F5DC) |
| Text Secondary | Medium Brown (#6D4C41) | Warm Gray (#B0A89F) |

## 6.3 Typography

- **Headings:** Inter, 600 weight
- **Body:** Inter, 400 weight
- **Mono (numbers):** JetBrains Mono, 500 weight (for weight/rep displays)

## 6.4 Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| Mobile | < 640px | Bottom nav, single column, card-based lists |
| Tablet | 640-1024px | Side nav, 2-column grids where appropriate |
| Desktop | > 1024px | Side nav, multi-column layouts, tables allowed |

**No Horizontal Scrolling:** All tables must stack or convert to cards on mobile.

## 6.5 Accessibility

- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation for all interactive elements
- Screen reader labels on icon buttons
- Focus indicators visible
- Error messages associated with form fields

---

# 7. AI Integration

## 7.1 Architecture

All AI requests go through backend API route: `POST /api/ai/workout-assistant`

```javascript
// Frontend request
const response = await fetch('/api/ai/workout-assistant', {
  method: 'POST',
  body: JSON.stringify({
    message: "Should I rest longer for heavy squats?",
    context: {
      current_exercise: "Barbell Back Squat",
      recent_sets: [...], // Last 2-3 sets of current exercise
      workout_id: "..."
    }
  })
});
```

Backend proxies to OpenAI with system prompt and maintains conversation state.

## 7.2 Conversation Context

### Context Included
- Current workout name
- Currently active exercise (if applicable)
- Last 2-3 completed sets of the **currently active exercise**
- If user just started a new exercise, last 2-3 sets of the **previous exercise**
- Last 2-3 message pairs (user question + AI response)

**Rationale:** Sending sets from exercises the user completed 30 minutes ago wastes tokens and provides irrelevant context. Focus on what the user is doing right now.

### Context Reset
- When workout completes
- When user closes AI panel
- After 10 minutes of inactivity

### Rate Limiting
- Max 20 AI requests per workout
- Max 100 AI requests per user per day
- Soft limits - can be increased if needed

## 7.3 AI Safety & Disclaimers

### Disclaimer Placement
- Shown once at start of first AI interaction per workout
- Accessible via info icon in AI panel
- Not repeated on every message (to avoid UX friction)

### Disclaimer Text
"AI responses are for informational purposes only and should not replace professional medical or fitness advice. Always consult with a qualified trainer or healthcare provider for personalized guidance. Prioritize proper form and safety at all times."

### AI Response Tone Guidelines

**System Prompt Should Enforce Tentative Language:**
- ✅ Use: "Consider increasing weight by 5-10 lbs based on your RIR"
- ✅ Use: "You might benefit from an extra rest day"
- ✅ Use: "Based on your data, this approach could work"
- ❌ Avoid: "You should increase to 225 lbs"
- ❌ Avoid: "You must rest 3 minutes"
- ❌ Avoid: "Do exactly 4 sets of 8-12 reps"

**Rationale:** Users may follow AI suggestions blindly mid-workout. Tentative language encourages users to think critically rather than comply automatically.

### Prohibited AI Capabilities
AI assistant cannot:
- Diagnose injuries or medical conditions
- Recommend specific supplements or medications
- Write full workout programs (this is V2 feature)
- Provide exact weight recommendations (can suggest percentage-based progressions)

---

# 8. Design System

## 8.1 Button Styles

| Type | Use Case | Style |
|------|----------|-------|
| Primary | Main actions (Start Workout, Save) | Sage green background, white text |
| Secondary | Cancel, alternative actions | Gray border, transparent bg |
| Danger | Delete, archive | Red border or background |
| Text | Low-priority actions | No border, colored text |

## 8.2 Card Components

All cards have:
- 8px border radius
- Subtle shadow (0 2px 4px rgba(0,0,0,0.1))
- 16px padding
- Hover state on interactive cards

## 8.3 Form Inputs

- Outlined style (no underline-only inputs)
- Label above input
- Helper text below if needed
- Error state: red border + error message below
- Focus state: primary color border

## 8.4 Toast Notifications

| Type | Use | Duration | Color |
|------|-----|----------|-------|
| Success | Action completed | 3s | Green background |
| Error | Action failed | 5s (requires dismiss) | Red background |
| Warning | Potential issue | 4s | Amber background |
| Info | General notice | 3s | Blue background |

### Conflict Detection Toast

When last-write-wins detects potential conflict:
- Toast type: Warning
- Message: "Workout updated {X} minutes ago on another device. Your changes have been saved."
- Duration: 5 seconds
- Action button: "View Changes" (optional, shows diff)

**Trigger Condition:** If server `updated_at` differs from local `updated_at` by more than 5 minutes.

---

# 9. Error Handling & Recovery

## 9.1 Network Errors

### API Request Failures
- Retry 3 times with exponential backoff (1s, 2s, 4s)
- On final failure, queue action in IndexedDB sync queue
- Show toast: "Connection lost. Changes will sync when online."

### Sync Failures
- Background sync attempts every 5 minutes when online
- Manual sync button in settings
- Sync queue visible in settings with pending count

## 9.2 Data Validation Errors

- Inline validation on form fields (real-time feedback)
- Summary of errors at top of form on submit
- Focus first error field
- Specific error messages (see Appendix A)

## 9.3 Sync Status Indicators

### Header Icon
- Green checkmark: All data synced
- Yellow clock: Sync in progress
- Red warning: Offline, N items pending sync
- **Orange alert: Sync failed** (NEW in v1.2.1)
- Clickable to open sync status detail modal

### Per-Workout Badges
Workouts in history view show sync status:
- No badge: synced
- "Local" badge (yellow): pending first sync
- "Failed" badge (red): sync failed permanently
- "Conflict" badge (orange): sync conflict detected (rare)

### 9.3.1 Permanent Sync Failure Handling (NEW)

**Failure States:**
- **Transient:** Network timeout, server error 5xx (retry automatically)
- **Permanent:** Schema mismatch, validation error, corrupted payload (cannot auto-resolve)

**User-Facing Behavior:**
When a workout fails to sync permanently:
1. Sync status badge shows "Failed"
2. Header icon shows orange alert with count
3. Clicking header opens "Sync Issues" modal showing:
   - Which workouts failed
   - Error reason (simplified for users)
   - Actions available:
     - **Retry Sync** (for transient errors)
     - **Export as JSON** (preserve data)
     - **Discard** (delete local copy)

**Example Error Messages:**
- "This workout has invalid data. Export it to save your work."
- "Server rejected this workout (schema change). Contact support or export data."

**Implementation Note:** Failed workouts remain in IndexedDB with `sync_status = 'failed'` and are NOT automatically retried. Users must take action.

**Critical UX Copy:** When user selects "Discard" for a failed workout, the confirmation dialog MUST include: **"This cannot be undone. Your workout will be permanently deleted."**

## 9.4 Error Boundaries

React Error Boundaries catch component crashes:
- Show fallback UI: "Something went wrong. Refresh to continue."
- Log error to console (no remote logging in V1)
- Preserve user data in localStorage

## 9.5 Catastrophic Storage Failures (NEW)

### Scenarios
- IndexedDB becomes corrupted
- Browser storage evicted (iOS Safari after 7 days inactive)
- Failed IndexedDB writes
- Storage quota exceeded

### Detection
On app startup, attempt to read IndexedDB. If read fails:
1. Detect corruption vs. eviction
2. Check server sync timestamp (last known good state)
3. Show recovery modal

### Recovery UX
**Modal Message:**
```
Local data unavailable
Last synced: January 15, 2026 at 3:42 PM

Your workouts are safely stored on the server. 
Refresh to restore your data.

[Refresh App] [Contact Support]
```

**Behavior:**
- Clear corrupted IndexedDB
- Re-download last 30 days of workouts from server (initial cache)
- Rebuild local cache
- Resume normal operation

**Pagination Beyond 30 Days:**
- Initial recovery loads last 30 days for performance
- Older workouts are lazy-loaded when user navigates to History
- Infinite scroll fetches additional pages (50 workouts per page)
- All server data remains accessible; 30-day window is only for initial cache rebuild

**Data Loss Scenarios:**
- If user logged workouts offline AFTER last sync, those workouts are permanently lost
- No recovery possible for unsyncable local data

**Explicit Limitation:** This is documented as a known risk of offline-first architecture. Users are warned to stay connected when possible.

---

# 10. PWA & Offline Support

## 10.1 Manifest Configuration

- App name: "GymBrAIn"
- Short name: "GymBrAIn"
- Display: standalone (fullscreen mode)
- Orientation: portrait-primary (mobile), any (tablet/desktop)
- Start URL: /
- Theme color: #6B8E6B (sage green)
- Background color: same as theme color
- Icons: 192x192, 512x512 (designed with brain/AI motif in earthy green)

## 10.2 Service Worker Strategy

- Cache-first for static assets (JS, CSS, fonts)
- Network-first for API calls with offline fallback
- Exercise library (text only) cached on install
- Sync queue for pending workout data

## 10.3 iOS-Specific Limitations

**Critical:** iOS Safari does not support Background Sync API.
- Workouts saved offline will NOT auto-sync when connection returns
- Data syncs ONLY when the app is open and online
- Users must manually open the app to trigger sync
- UI must clearly indicate pending sync status (see Section 9.3)

## 10.4 Offline Data Storage

### Data Stored in IndexedDB
- Pending workouts (awaiting sync)
- Active workout drafts (local fallback)
- User preferences
- Exercise library cache (text only)
- Sync queue with timestamps

### Client-Side Sync Tracking (IMPORTANT)

**The `sync_status` field is a client-side augmentation stored only in IndexedDB to track upload state. It is NOT persisted to the server database.**

Local sync statuses:
- `local`: Not yet sent to server
- `synced`: Successfully uploaded and confirmed
- `failed`: Sync rejected by server (permanent failure)

**Key Distinction:** A workout can exist in both the server database (where it has no sync_status) AND in local IndexedDB (where it has `sync_status = 'synced'`). Local sync status is tracked independently and may temporarily differ from server state during offline periods.

### UUID Generation for Offline Records (NEW)

**Critical Implementation Detail:**
When creating records offline (workouts, exercises, sets), the frontend MUST generate valid v4 UUIDs using:

```javascript
// Modern browsers (preferred)
const id = crypto.randomUUID();

// Fallback for older browsers
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

**Rationale:** The database expects UUID primary keys. Generating temporary IDs like `"temp-1"` would require complex ID remapping during sync. Using real UUIDs allows sending the exact same data structure to the backend without transformation.

### Data Lifecycle
- Timestamps on all records for sync ordering
- Clear pending data after successful sync confirmation
- Failed syncs retain data with `sync_status = 'failed'` for manual resolution

## 10.5 Sync Strategy

- Last-write-wins conflict resolution with detection
- Automatic sync attempt when app opens with connection
- Manual sync button available in settings
- Sync status indicator in header (see Section 9.3)
- Retry with exponential backoff on transient failures
- Permanent failures surface to user (see Section 9.3.1)

## 10.6 Offline Limitations

- AI assistant unavailable offline (show disabled state)
- Custom exercises created offline sync on reconnect
- Progress charts may show stale data until sync
- Password reset unavailable offline
- Draft cross-device sync unavailable offline

---

# 11. Exercise Library

## 11.1 Categories by Muscle Group

| Muscle Group | Example Exercises |
|-------------|-------------------|
| Chest | Bench Press, Incline Press, Cable Fly, Dumbbell Fly, Push-Up, Dip |
| Back | Deadlift, Barbell Row, Lat Pulldown, Pull-Up, Cable Row, T-Bar Row |
| Shoulders | Overhead Press, Lateral Raise, Front Raise, Face Pull, Reverse Fly |
| Biceps | Barbell Curl, Dumbbell Curl, Hammer Curl, Preacher Curl, Cable Curl |
| Triceps | Tricep Pushdown, Skull Crusher, Dip, Overhead Extension, Close Grip Bench |
| Forearms | Wrist Curl, Reverse Curl, Farmer Carry, Dead Hang |
| Quads | Squat, Leg Press, Leg Extension, Lunge, Bulgarian Split Squat |
| Hamstrings | Romanian Deadlift, Leg Curl, Good Morning, Nordic Curl |
| Glutes | Hip Thrust, Glute Bridge, Cable Kickback, Step-Up |
| Calves | Standing Calf Raise, Seated Calf Raise, Donkey Calf Raise |
| Core | Plank, Crunch, Leg Raise, Cable Woodchop, Ab Wheel |

## 11.2 Categories by Equipment

- **Barbell**: Olympic lifts, compound movements
- **Dumbbell**: Unilateral variations, isolation work
- **Cable**: Constant tension exercises
- **Machine**: Fixed-path exercises
- **Bodyweight**: No equipment required
- **Other**: Kettlebells, bands, specialty equipment

## 11.3 Exercise Data Structure

Each exercise in the library includes:
- Unique ID
- Name (searchable)
- Type: weighted | bodyweight | cardio | timed (see Section 3.3.1 for clarifications)
- Equipment: barbell | dumbbell | cable | machine | bodyweight | other
- Primary muscle groups (array)
- Secondary muscle groups (array)
- Custom flag (false for library exercises)
- Archived flag (false by default)

## 11.4 Custom Exercise Deduplication

When users create custom exercises, fuzzy string matching is used to prevent duplicates:
- Compare against existing library exercises (non-archived)
- If similarity score > 70%, show "Did you mean...?" suggestions
- Top 3 matches displayed
- User can select existing or proceed with custom creation

## 11.5 Exercise Renaming & Historical Integrity (UPDATED)

**Retroactive Changes Policy:**

When an exercise is renamed or edited (name, muscle groups, equipment):
- All historical workouts **automatically reflect the new values**
- This is **intentional behavior**, not a bug
- The system stores `exercise_id` in `WorkoutExercise`, not a snapshot of exercise data

**Implications:**
- Renaming "Bench Press" → "Barbell Bench Press" updates all past workouts
- Changing primary muscle from "Chest" to "Chest + Triceps" updates muscle group charts retroactively
- Progress charts reflect current exercise definitions

**User Guidance:**
If you want to preserve historical names (e.g., tracking two variations separately), **create a new exercise** instead of editing the existing one.

**Example:**
- Original: "Overhead Press"
- Want to track: "Barbell Overhead Press" vs "Dumbbell Overhead Press"
- Solution: Create two new exercises, archive "Overhead Press"

**Rationale:** This design choice simplifies the data model and aligns with how most users think about exercises (as evolving entities, not immutable snapshots).

**V2 Constraint - Shared Templates:** When workout sharing is introduced in V2, shared templates will rely on the current global exercise definition. If a library exercise is edited, all users' templates referencing that exercise will reflect the new definition. This is intentional behavior to maintain data consistency, but users should be warned when editing global exercises that are used in shared templates.

---

# 12. Database Performance

## 12.1 Required Indexes

Performance-critical indexes that must be created:

```sql
-- Lookup workouts for a user (history view)
CREATE INDEX idx_workout_user_started ON workout(user_id, started_at DESC);

-- Lookup exercises in a workout (workout detail view)
CREATE INDEX idx_workout_exercise_workout ON workout_exercise(workout_id);

-- Lookup which workouts use an exercise (exercise history)
CREATE INDEX idx_workout_exercise_exercise ON workout_exercise(exercise_id);

-- Lookup sets for an exercise in a workout (set logging)
CREATE INDEX idx_set_workout_exercise ON set(workout_exercise_id);

-- Lookup templates for a user (template list)
CREATE INDEX idx_template_user ON template(user_id);

-- Lookup exercises in a template (template detail)
CREATE INDEX idx_template_exercise_template ON template_exercise(template_id);

-- Lookup which templates use an exercise (archiving checks)
CREATE INDEX idx_template_exercise_exercise ON template_exercise(exercise_id);

-- Lookup custom exercises by creator (library view)
CREATE INDEX idx_exercise_creator ON exercise(created_by) WHERE created_by IS NOT NULL;

-- Password reset token lookup
CREATE INDEX idx_password_reset_token ON password_reset_token(token);
CREATE INDEX idx_password_reset_user ON password_reset_token(user_id);

-- Workout draft lookup (NEW)
CREATE INDEX idx_workout_draft_user ON workout_draft(user_id);
CREATE INDEX idx_workout_draft_expires ON workout_draft(expires_at) WHERE expires_at IS NOT NULL;
```

**Note:** The `sync_status` field does not exist in the server schema (see Section 10.4), so no index is created for it.

## 12.2 Index Maintenance

- Indexes are created during initial schema setup
- Monitor slow query log in production (Neon provides this)
- Add composite indexes if specific query patterns emerge
- Consider partial indexes for soft-deleted records if performance degrades

## 12.3 Query Optimization Guidelines

- Always include `user_id` in WHERE clauses to partition data
- Use `LIMIT` on history queries (default: 50 workouts, pagination for more)
- Avoid `SELECT *` - fetch only needed columns
- Use prepared statements to prevent SQL injection

---

# Appendix A: Input Validation Rules

| Field | Validation | Error Message |
|-------|------------|---------------|
| Username | 3-30 chars, alphanumeric + underscore | "Username must be 3-30 characters, letters, numbers, and underscores only" |
| Password | Minimum 8 characters | "Password must be at least 8 characters" |
| Email | Valid email format, **required** | "Please enter a valid email address" |
| Weight (set) | 0-1500, decimal to 0.1 | "Enter a valid weight (0-1500)" |
| Reps | 1-100, integer | "Enter a valid rep count (1-100)" |
| RIR | 0-10, integer | "RIR must be between 0-10" |
| Duration | Positive integer (seconds) | "Enter a valid duration" |
| Distance | Positive decimal | "Enter a valid distance" |
| Exercise name | 1-100 characters | "Exercise name required" |
| Workout name | 1-100 characters | "Workout name required" |
| Rest timer | 30, 60, 90, 120, 180, 300 seconds | N/A (select only) |

---

# Appendix B: API Endpoints (V1)

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new user account |
| POST | /api/auth/login | Authenticate user, return JWT |
| POST | /api/auth/logout | End user session |
| POST | /api/auth/refresh | Refresh JWT token |
| POST | /api/auth/forgot-password | Send password reset email |
| POST | /api/auth/reset-password | Set new password with token |

## Exercises

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/exercises | Get exercise library (excludes archived) |
| POST | /api/exercises | Create custom exercise |
| PUT | /api/exercises/:id/archive | Archive an exercise (soft delete) |

## Workouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workouts | Get user workouts |
| POST | /api/workouts | Create/start workout |
| PUT | /api/workouts/:id | Update workout |
| DELETE | /api/workouts/:id | Delete workout |
| POST | /api/workouts/sync | Sync offline workouts (batch) + delete drafts |
| POST | /api/workouts/draft | Save/update active workout draft |
| GET | /api/workouts/draft | Get current active draft |
| DELETE | /api/workouts/draft | Delete draft (on workout complete) |

**Note:** `/api/workouts/sync` now accepts `delete_draft_ids` array to prevent zombie drafts.

## Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/templates | Get user templates |
| POST | /api/templates | Create template |
| PUT | /api/templates/:id | Update template |
| DELETE | /api/templates/:id | Delete template |
| GET | /api/templates/:id/exercises | Get template exercises (join with exercise library) |

## Progress & PRs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/progress/:exerciseId | Get exercise progress data |
| GET | /api/prs | Get all user PRs |
| GET | /api/stats/weekly | Get weekly muscle group stats |

## AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/workout-assistant | Mid-workout AI query (timeout: 5s) |

## User

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/user/settings | Get user preferences |
| PUT | /api/user/settings | Update user preferences |
| GET | /api/user/export | Export user data as JSON |

---

# Appendix C: Changelog

## Version 1.2.2 - FINAL (Current)

**Critical Schema Cleanup:**
- **REMOVED:** `sync_status` field from `Workout` table (Section 3.4)
  - Resolves conflation between server schema and client-side tracking
  - Sync status is now explicitly client-side only (IndexedDB)
- **REMOVED:** `idx_workout_sync_status` index from Section 12.1
- **ADDED:** Explicit note in Section 10.4 that `sync_status` is NOT persisted to server

**Final Clarifications:**
- **ADDED:** Bodyweight volume limitation warning (150 lbs estimate for trend comparison only)
- **ADDED:** Timestamp storage clarification (UTC in DB, local timezone for display)
- **ADDED:** Admin UI explicitly stated as non-existent in V1
- **ADDED:** "This cannot be undone" warning for permanent sync failure discard action
- **ADDED:** 30-day recovery window pagination clarification (lazy-load older workouts)
- **ADDED:** V2 constraint documentation for shared templates + global exercise edits
- **UPDATED:** `Workout.completed_at` now explicitly UTC (was nullable, now required for completed workouts)

**Documentation Improvements:**
- Clarified client vs server sync tracking boundaries
- Explicit statement that workouts in server DB are synced by definition
- Added context for IndexedDB recovery scope and pagination strategy

## Version 1.2.1 (Previous)

**Critical Schema Fix:**
- **REMOVED:** `is_draft` field from `Workout` table (Section 3.4)
  - Resolves schema conflict between `Workout.is_draft` and `WorkoutDraft` table
  - Active workouts now stored ONLY in `WorkoutDraft` table
  - Completed workouts stored in `Workout` table after atomic conversion

**New Features & Clarifications:**

### Data Model
- **UPDATED:** `Workout` table - removed `is_draft`, added `sync_status = 'failed'` option
- **UPDATED:** `WorkoutDraft` lifecycle and zombie draft prevention documented
- **ADDED:** UUID generation requirements for offline records (Section 10.4)
- **ADDED:** Order index normalization for `TemplateExercise` (Section 3.8)

### Sync & Error Handling
- **ADDED:** Permanent sync failure handling (Section 9.3.1)
- **ADDED:** Catastrophic storage failure recovery (Section 9.5)
- **ADDED:** "Sync failed" badge and user-facing error resolution UI
- **CLARIFIED:** Draft deletion on workout completion (Section 4.3.2)
- **ADDED:** Zombie draft prevention in sync endpoint

### AI Integration
- **REFINED:** Context window to focus on currently active exercise (Section 7.2)
- **ADDED:** AI response tone guidelines (tentative language) (Section 7.3)

### Exercise Library
- **CLARIFIED:** Exercise edit behavior is retroactive (Section 11.5)
- **ADDED:** Explicit policy on historical integrity vs. snapshots

### Database
- **ADDED:** Indexes for `workout_draft` table
- **ADDED:** Partial index for failed sync status

### Documentation
- **ADDED:** Template order index normalization behavior (Section 4.4)
- **IMPROVED:** Error states now comprehensively documented

## Version 1.2 (Previous)

**Major Changes:**

### Data Model
- **BREAKING:** `Template` table restructured - removed JSON exercise storage
- **NEW:** `TemplateExercise` join table for normalized template structure
- **NEW:** `WorkoutDraft` table for cross-device draft syncing
- **CHANGED:** `User.email` now required (NOT NULL)
- **REMOVED:** `User.unit_preference` (imperial only)
- **ADDED:** Numeric precision standards documented (DECIMAL types)

### Technical Architecture
- **ADDED:** `@neondatabase/serverless` driver requirement
- **ADDED:** Database indexing strategy (Section 12)
- **ADDED:** AI timeout & fallback behavior (5s timeout)
- **CLARIFIED:** Exercise type vs equipment (Section 3.3.1)
- **ADDED:** Volume calculation rules explicitly defined

### Features
- **CHANGED:** Rest timer no longer auto-starts (manual start required)
- **ADDED:** Draft sync to server every 30 seconds
- **ADDED:** Conflict detection toast for last-write-wins
- **ADDED:** Warm-up set PR detection toast
- **CHANGED:** Mobile history view uses cards, not tables

### UX Improvements
- **ADDED:** Exercise type clarification for edge cases
- **ADDED:** Email requirement for password reset
- **ADDED:** Offline draft sync behavior documented
- **CHANGED:** AI disclaimer shows once per session (not per message)

### Performance
- **ADDED:** Required database indexes
- **ADDED:** Connection pooling documentation
- **ADDED:** Offline image caching policy (text-only)

---

*— End of Specification Document —*
