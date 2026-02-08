# **V2 Project Specification: GymBrAIn Active Coach (Technical Manifest)**

**Date:** February 8, 2026
**Version:** 2.7.1 (Golden Master)
**Architecture:** PWA (Vite/React), Neon (Postgres/Raw SQL), IndexedDB
**Constraint Level:** Strict (Do not deviate from stack)

---

## **1. Technical Constraints & Stack**

**⚠️ CRITICAL AGENT INSTRUCTIONS:**
1.  **Language:** Use **JavaScript** (`.js`/`.jsx`) only. **DO NOT** introduce TypeScript (`.ts`/`.tsx`).
2.  **Database:** Use **Raw SQL** with existing `@neondatabase/serverless` pattern. **DO NOT** install Drizzle, Prisma, or TypeORM.
3.  **Naming Convention:** Existing database uses **SINGULAR** table names (e.g., `workout`, `exercise`). New tables must follow this pattern.
4.  **Reserved Words:** You MUST double-quote reserved table names in SQL: `"user"`, `"group"`.
5.  **Directories:**
    * Shared Client/Utils: `/src/lib/` (NOT `/src/utils/`)
    * Backend Shared: `/api/_lib/` (NOT `/api/lib/`)
6.  **Formatting:** Ensure all new code follows the existing `.eslintrc.json`.

---

## **2. Database Schema (DDL)**

Implement these changes via new migration files (incrementing from current `005`).

### **Migration 006: Plans & Exercise Extensions**

```sql
-- 1. Add compound flag to existing 'exercise' table
ALTER TABLE exercise ADD COLUMN is_compound BOOLEAN DEFAULT FALSE;

-- 2. Seed Compound Exercises (Crucial for Deload Logic)
UPDATE exercise SET is_compound = TRUE
WHERE name ILIKE ANY (ARRAY[
  '%Squat%', '%Deadlift%', '%Bench Press%', '%Overhead Press%', '%Pull-Up%', '%Dip%'
]);

-- 3. Create the 'plan' table
CREATE TABLE plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'archived', 'draft')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- JSONB Config (Schema Version 1)
  -- Structure: {
  --   schema_version: 1,
  --   split_type: "PPL" | "UL",
  --   days: [{
  --     label: "Push A",
  --     exercises: [{ exercise_id: uuid, sets: number, rep_range: [min, max], rest_time: number }]
  --   }]
  -- }
  config JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_plan_user_status ON plan(user_id, status);

-- 4. Link 'workout' to 'plan'
ALTER TABLE workout ADD COLUMN plan_id UUID REFERENCES plan(id) ON DELETE SET NULL;
ALTER TABLE workout ADD COLUMN plan_day_index INTEGER;
ALTER TABLE workout ADD COLUMN is_deload BOOLEAN DEFAULT FALSE; -- Prevents infinite deload loops

CREATE INDEX idx_workout_plan ON workout(plan_id, started_at DESC);
```

### **Migration 007: Social Groups**

```sql
-- "group" is a reserved word, must be quoted
CREATE TABLE "group" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_member (
  group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_member_user ON group_member(user_id);
```

### **Migration 008: Social Interactions**

```sql
CREATE TABLE reaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  emoji TEXT CHECK (emoji IN ('🔥', '👏', '💪', '🚀')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_id, user_id, emoji)
);

-- Add sharing flag to 'workout'
-- If TRUE, visible to members of any group the user belongs to.
ALTER TABLE workout ADD COLUMN shared_to_groups BOOLEAN DEFAULT FALSE;
```

---

## **3. Logic Specifications**

### **3.1 Plan Scheduling: Sequence Mode**

**Dual Implementation Required:** This logic must exist in both the API (`GET /api/plans/:id/next`) AND the Client (`/src/lib/progression.js` using IndexedDB) to support offline starts.

**Query:**

```sql
SELECT plan_day_index
FROM workout
WHERE plan_id = $1 AND is_deload = FALSE
ORDER BY started_at DESC
LIMIT 1
```

**Logic:**
1. Fetch Plan Config.
2. Find last workout using the query above.
3. If no previous workout: `Next Index = 0`.
4. If previous exists: `Next Index = (last_index + 1) % days.length`.

**UI:** "Start Workout" button triggers the draft generation for the Next Index day.

### **3.2 Progressive Overload (Deterministic Tier 1)**

**File:** `/src/lib/progression.js`
**Function:** `calculateTarget(lastWeight, lastReps, repRangeMax)`

```javascript
export function calculateTarget(lastWeight, lastReps, repRangeMax) {
  if (!lastWeight) return null; // Cold start: user inputs manually

  // Only increase if user hit top of rep range
  if (lastReps >= repRangeMax) {
    // Increase by ~2.5% (rounded to nearest 2.5 lbs)
    return Math.round((lastWeight * 1.025) / 2.5) * 2.5;
  }

  // Otherwise maintain weight
  return lastWeight;
}
```

### **3.3 Deload Logic**

- **Trigger:** Estimated 1RM decreases for 3 consecutive sessions on a specific `is_compound` exercise.
- **Exclusion:** Ignore any workout where `is_deload = TRUE`. (Prevents infinite loops).
- **Action:** Show "Deload Suggestion" modal.
- **Consequence:** If accepted, the generated draft applies a `0.5` scalar to weights and sets `is_deload = TRUE` on the new workout.

---

## **4. API Contract**

**Authentication:** All routes require existing `requireAuth` middleware.

### **4.1 Plan Management**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/plans` | List user's plans. |
| GET | `/api/plans/:id` | Get plan details/config. |
| PUT | `/api/plans/:id` | Update (Archive/Rename). |
| DELETE | `/api/plans/:id` | Delete plan. |
| GET | `/api/plans/:id/next` | Returns `{ nextDayIndex, label }` (Sequence Logic). |

### **4.2 AI Tools**

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/ai/onboard/interview` | `{ step: number, stats: STATS_SCHEMA }` | `{ questions: string[] }` |
| POST | `/api/ai/onboard/generate` | `{ stats: STATS_SCHEMA, answers: [] }` | `{ planConfig: JSON }` |
| POST | `/api/coach/adjust` | `{ exercise_id, weight, reps, feedback }` | `{ new_weight, new_reps }` |

**`STATS_SCHEMA`:**

```json
{
  "weight": "number",
  "experience": "beginner | intermediate",
  "equipment": "string[]",
  "goals": "string[]"
}
```

**Validation:** `/api/ai/onboard/generate` MUST validate the structure of the LLM output before returning. If invalid, return `500` and client retries.

### **4.3 Social Groups**

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/api/groups` | - | `[{ id, name, member_count }]` |
| POST | `/api/groups` | `{ name }` | `{ group_id, invite_code }` |
| POST | `/api/groups/join` | `{ invite_code }` | `{ success: true }` |
| DELETE | `/api/groups/:id` | - | - |
| POST | `/api/groups/:id/leave` | - | - |
| GET | `/api/groups/feed` | `?page=1` | `FEED_RESPONSE` (see below) |

**`FEED_RESPONSE` Schema:**

```json
{
  "items": [
    {
      "id": "uuid",
      "user_display_name": "string",
      "workout_name": "string",
      "duration_seconds": "number",
      "exercise_count": "number",
      "created_at": "ISO8601",
      "reaction_counts": { "🔥": 2, "💪": 1 }
    }
  ],
  "hasMore": "boolean"
}
```

### **4.4 Interaction**

| Method | Endpoint | Purpose | Request |
|--------|----------|---------|---------|
| POST | `/api/workouts/:id/reaction` | Toggle emoji. | `{ emoji: "🔥" }` |
| PUT | `/api/workouts/:id/share` | Toggle shared_to_groups. | `{ shared: boolean }` |
| GET | `/api/workouts/:id/share` | Observational View. | - |

**Reaction Logic:** Check if `(user_id, workout_id, emoji)` exists. If yes, `DELETE`. If no, `INSERT`.

**Observational Auth:** Requester must be a member of a group that the workout owner is also a member of. If no shared group membership exists, return `403`.

---

## **5. IndexedDB Schema Updates**

Update `/src/lib/indexedDB.js` to include new stores:

- **`plan`:** KeyPath `id`. Cache active plan config for offline calculation.
- **`feed`:** KeyPath `id`. Cache last 20 feed items.

---

## **6. AI System Prompts**

**Location:** `/api/_lib/prompts.js`

### **6.1 Plan Generator Prompt**

```text
You are an expert strength coach.
Context: User Stats: [JSON].
Task: Create a [Type] split.
Constraint: Use ONLY existing exercise IDs provided in context list.
Critical: Output must match the schema:
  { split_type: string, days: [{ label: string, exercises: [{ exercise_id: uuid, sets: number, rep_range: [min, max], rest_time: number }] }] }.
```

### **6.2 Active Coach Prompt**

```text
You are a supportive but disciplined coach.
Input: User just did [Weight]x[Reps] on [Exercise]. Feedback: '[User Feedback]'.
Task: Recommend specific adjustment for the NEXT set only.
Output JSON: { new_weight: number, new_reps: number, message: string (max 15 words) }.
```

---

## **7. Execution Roadmap**

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| **Phase 1 (Data)** | Database | Create Migrations 006-008. Verify `plan_id` FK. |
| **Phase 2 (Logic)** | Core Math | Create `/src/lib/progression.js`. Write Unit Tests for Sequence & `calculateTarget`. |
| **Phase 3 (API)** | Endpoints | Implement Plan CRUD & Group CRUD using existing service/route patterns. |
| **Phase 4 (UI)** | Frontend | Build "Start Plan" Button (Sequence Mode). |
| **Phase 5 (AI)** | Integration | Build Interview Modal (Client State) & hook up AI endpoints. |
