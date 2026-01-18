# GymBrAIn

Production-ready workout tracking PWA with AI assistance.

## Tech Stack

- **Frontend:** React 18 (Vite)
- **Backend:** Node.js/Express on Vercel serverless functions
- **Database:** PostgreSQL via Neon (`@neondatabase/serverless` driver)
- **Auth:** JWT with refresh tokens, bcrypt password hashing
- **AI:** OpenAI GPT-4o-mini (server-side proxy only, 5s timeout)
- **PWA:** Service Worker + IndexedDB for offline support
- **Email:** Resend (password reset only)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Neon Postgres database
- OpenAI API key
- Resend API key

### Installation

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Install Vercel CLI globally (required for local development):**
   ```bash
   npm install -g vercel
   ```

4. Copy `.env.example` to `.env.local` and fill in your environment variables:
   ```bash
   cp .env.example .env.local
   ```

5. Run database migrations:
   ```bash
   node scripts/run-migrations.js
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - **Start full-stack dev server (Vercel CLI)** - Frontend + API on port 3000
- `npm run dev:frontend` - Start frontend only (Vite on port 5173)
- `npm run dev:api` - Start API test server (Express on port 3001)
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npm run preview` - Preview production build
- `npm run test` - Run Jest tests

### Why Vercel CLI?

GymBrAIn uses Vercel serverless functions for the backend API. The Vercel CLI (`vercel dev`) runs both the frontend and API routes together, simulating the production environment locally. **Always use `npm run dev` for full-stack development.**

See [VERCEL_CLI_SETUP.md](./VERCEL_CLI_SETUP.md) for detailed setup instructions.

## Project Structure

```
/src
  /components       # React UI components
  /pages           # Route-level page components
  /lib             # Utilities, API clients, data models
  /hooks           # Custom React hooks
/api               # Vercel serverless API routes
  /auth           # Login, register, password reset
  /workouts       # CRUD, sync, draft endpoints
  /exercises      # Exercise library management
  /templates      # Template management
  /ai             # AI assistant proxy
  /user           # User data export
/public
  /service-worker.js  # PWA offline logic
  /manifest.json      # PWA manifest
```

## Documentation

- **[Vercel CLI Setup Guide](./VERCEL_CLI_SETUP.md)** - Local development setup
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Phase-by-phase build guide
- [Technical Specification](./GymBrAIn_Specification_v1_2_2_FINAL.md) - Product requirements
- [Development Guidelines](./CLAUDE.md) - Technical constraints and patterns
- [Phase 7 Summary](./PHASE_7_SUMMARY.md) - Progress & PR tracking implementation

## License

Private project - All rights reserved
"# gym-brain-v2" 
