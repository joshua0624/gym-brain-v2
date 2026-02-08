# GymBrAIn Engineering Protocols

## AI Tooling and Gemini MCP

**Model Selection:** All `gemini-mcp` tool calls must explicitly specify the model as `gemini-2.5-flash`.

**Usage Trigger:** Invoke for any task involving analysis of more than 5 files or high-level architectural planning.

**Success Criteria:** All tool outputs must include a definitive PASS or FAIL assessment for proposed technical plans.

## Pre-Mortem Review Loop

Execute this sequence before applying any large-scale implementation or system-wide change:

1. **Draft Plan:** Create the implementation plan in the current session.
2. **Review Prompt:** Use `gemini-mcp` with the following instruction:

> "Review this plan as a Senior Architect. Check for: 1) Zombie drafts/sync conflicts, 2) Offline failure modes, 3) Neon connection pool exhaustion. Output 'PASS' or 'FAIL' with a list of specific blockers."

3. **Refine:** Do not proceed with code generation until the tool returns a PASS.

## Backend Standards

**Path:** `/api/...`
**Authentication:** Wrap protected routes with `requireAuth` middleware.
**Database:** Use the shared `@neondatabase/serverless` instance from `_lib/db.js`.

### API Boilerplate Pattern

```javascript
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/middleware/auth.js';

async function handleGet(req, res) {
  const userId = req.user.userId;
  const data = await sql`SELECT * FROM table WHERE user_id = ${userId}`;
  return res.json(data);
}
```

## Database Tables

### V1 Tables
`"user"`, `exercise`, `workout`, `workout_exercise`, `"set"`, `template`, `template_exercise`, `workout_draft`, `password_reset_token`, `ai_request_log`

### V2 Tables (Migrations 006-008)
`plan`, `"group"`, `group_member`, `reaction`

### V2 Columns Added to Existing Tables
- `exercise.is_compound` (BOOLEAN) — deload trigger flag
- `workout.plan_id` (UUID FK) — links workout to plan
- `workout.plan_day_index` (INTEGER) — which day in plan config
- `workout.is_deload` (BOOLEAN) — excludes from 1RM trend analysis
- `workout.shared_to_groups` (BOOLEAN) — social visibility

**Note:** `"user"`, `"group"`, and `"set"` are PostgreSQL reserved words and MUST be double-quoted in all SQL.

## Sync and Data Integrity

- **Atomic Deletion:** Delete `WorkoutDraft` immediately upon `Workout` creation to prevent data pollution.
- **Conflict Resolution:** Use Last-Write-Wins logic for background synchronization.
- **Offline Progression:** Tier 1 logic (`/src/lib/progression.js`) must run client-side using IndexedDB data for offline plan starts.
