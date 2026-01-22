# Vercel CLI Setup Guide

## Why Vercel CLI?

GymBrAIn uses **Vercel serverless functions** for the backend API. To develop locally, you need the Vercel CLI to:

1. **Run API routes locally** - The `/api/*` endpoints won't work with just `vite`
2. **Simulate production environment** - Match how your app will run in production
3. **Test full-stack features** - Frontend and backend together on one server
4. **Seamless deployment** - Same CLI for dev and deployment

---

## Installation

### One-Time Setup

```bash
# Install Vercel CLI globally
npm install -g vercel
```

**Verify installation:**
```bash
vercel --version
# Should output: Vercel CLI 33.x.x (or similar)
```

---

## Local Development

### Starting the Dev Server

```bash
# From project root
npm run dev
```

This runs `vercel dev` which:
- Starts frontend on `http://localhost:3000`
- Serves API routes at `http://localhost:3000/api/*`
- Watches for file changes and auto-reloads

**Example URLs:**
- Frontend: `http://localhost:3000`
- Auth API: `http://localhost:3000/api/auth/login`
- Workouts API: `http://localhost:3000/api/workouts`
- Progress API: `http://localhost:3000/api/progress/[id]`

### First-Time Project Setup

The first time you run `vercel dev`, you'll be asked:

```
? Set up and develop "~/gymbrain"? [Y/n]
```

Answer: **Y** (yes)

```
? Which scope should contain your project?
```

Select your Vercel account (or skip if developing locally only)

```
? Link to existing project? [y/N]
```

Answer: **N** (no) unless you already have this project on Vercel

```
? What's your project's name?
```

Enter: **gymbrain**

```
? In which directory is your code located?
```

Enter: **./** (current directory)

### Environment Variables

Vercel CLI reads from `.env.local` automatically. Make sure you have:

```env
# .env.local (DO NOT COMMIT THIS FILE)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
```

**If deploying to Vercel:**
```bash
# Pull environment variables from Vercel project
vercel env pull .env.local
```

---

## Development Workflow

### Recommended Workflow (Full-Stack)

```bash
# Start everything
npm run dev

# Open browser to http://localhost:3000
# Make changes to frontend or API
# Vercel CLI auto-reloads
```

### Alternative Workflows

#### Frontend Only (No API)
```bash
npm run dev:frontend
# Runs on http://localhost:5173 (Vite default)
# API calls will fail - good for pure UI work
```

#### API Testing Only
```bash
npm run dev:api
# Runs test server on http://localhost:3001
# Only auth endpoints - for API endpoint testing
```

For Phase 7 progress endpoints:
```bash
node scripts/test-progress-endpoints.js
# Runs on http://localhost:3001
# Includes progress, PRs, weekly stats endpoints
```

---

## Troubleshooting

### Problem: `vercel: command not found`

**Solution:**
```bash
# Reinstall globally
npm install -g vercel

# Or use npx (no install needed)
npx vercel dev
```

### Problem: Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000 (Windows)
npx kill-port 3000

# Or use different port
vercel dev --listen 3001
```

### Problem: API routes return 404

**Solution:**
- Make sure you're using `vercel dev`, not `vite`
- Check that API files are in `/api` directory
- Verify `vercel.json` has correct routing config

### Problem: Environment variables not loading

**Solution:**
- Ensure `.env.local` exists in project root
- Restart `vercel dev` after changing env vars
- Check for typos in variable names
- Make sure no quotes around values in `.env.local`

### Problem: Database connection errors

**Solution:**
```bash
# Test database connection
node scripts/verify-db.js

# Check DATABASE_URL format (should be Neon connection string)
# Example: postgresql://user:pass@host.region.neon.tech/dbname?sslmode=require
```

---

## Deployment

### Deploy to Vercel

```bash
# Production deployment
vercel --prod

# Preview deployment (test before production)
vercel
```

### First-Time Deployment Setup

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Deploy
vercel --prod
```

### Set Environment Variables in Vercel

```bash
# Set via CLI
vercel env add DATABASE_URL production

# Or via Vercel Dashboard:
# 1. Go to project settings
# 2. Click "Environment Variables"
# 3. Add each variable (DATABASE_URL, JWT_SECRET, etc.)
# 4. Select "Production", "Preview", "Development"
# 5. Save
```

---

## Configuration Files

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

**What this does:**
- Builds static frontend using Vite
- Routes `/api/*` to serverless functions
- Routes everything else to frontend

### .vercelignore

Create this file to exclude files from deployment:

```
node_modules
.env.local
.env
*.log
.DS_Store
.vscode
scripts/
migrations/
*.md
```

---

## Package.json Scripts Reference

```json
{
  "scripts": {
    "dev": "vercel dev",
    // Start full-stack dev server
    // Frontend + API on http://localhost:3000

    "dev:frontend": "vite",
    // Start frontend only (no API)
    // Runs on http://localhost:5173

    "dev:api": "node scripts/test-server.js",
    // Start API test server only
    // Auth endpoints on http://localhost:3001

    "build": "vite build",
    // Build production bundle to /dist

    "preview": "vite preview",
    // Preview production build locally

    "lint": "eslint .",
    // Run ESLint on all files

    "test": "jest"
    // Run Jest unit tests
  }
}
```

---

## Quick Reference

| Command | Purpose | URL |
|---------|---------|-----|
| `npm run dev` | Full-stack dev (recommended) | http://localhost:3000 |
| `npm run dev:frontend` | Frontend only | http://localhost:5173 |
| `npm run dev:api` | API test server | http://localhost:3001 |
| `vercel --prod` | Deploy to production | Your Vercel domain |
| `vercel` | Deploy preview | Preview URL |
| `vercel logs` | View production logs | - |
| `vercel env pull` | Download env vars | - |

---

## Testing API Endpoints

### Using cURL

```bash
# Get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Save token
export TOKEN="your-jwt-token-here"

# Test progress endpoint
curl http://localhost:3000/api/progress/EXERCISE_ID \
  -H "Authorization: Bearer $TOKEN"

# Test PRs endpoint
curl http://localhost:3000/api/prs \
  -H "Authorization: Bearer $TOKEN"

# Test weekly stats
curl http://localhost:3000/api/stats/weekly \
  -H "Authorization: Bearer $TOKEN"
```

### Using Test Scripts

```bash
# Test Phase 7 endpoints
node scripts/test-progress-endpoints.js  # Start server
node scripts/test-progress-requests.js   # Run tests
```

---

## Common Questions

### Q: Do I need a Vercel account to develop locally?

**A:** No! You can use `vercel dev` without an account. You only need an account for deployment.

### Q: Can I use a different port?

**A:** Yes, use `vercel dev --listen <port>`

### Q: Does Vercel CLI work offline?

**A:** Yes, it works offline for local development. You only need internet for deployment.

### Q: How do I stop the dev server?

**A:** Press `Ctrl+C` in the terminal

### Q: Can I debug API routes?

**A:** Yes! Add `console.log()` or use VSCode debugger. Vercel CLI shows logs in terminal.

---

## Resources

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Environment Variables Guide](https://vercel.com/docs/environment-variables)

---

**Last Updated:** January 18, 2026
**Project:** GymBrAIn V1
**Status:** Production Ready
