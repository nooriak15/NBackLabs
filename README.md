# N-Back Labs

An N-back cognitive assessment platform. Built with Vite + React + Tailwind + shadcn-style UI components. Backed by Supabase (Postgres + Auth + Storage). Free to host on Vercel.

## How the app is split

- **Public landing page (`/`)**: participants enter a session code + subject ID and start the game.
- **Game runner (`/play/:sessionCode/:subjectId`)**: public, no login. Submits results back to Supabase as the anonymous role (RLS allows it).
- **Researcher login (`/login`)**: email + password.
- **Researcher dashboard (`/researcher/*`)**: protected. Create sessions, manage stimulus sets, view results.

## Prerequisites

- Node.js 18+
- A Supabase project. The schema and policies are in [`supabase_setup.sql`](./supabase_setup.sql); the small RLS hardening follow-up is in [`supabase_rls_fix.sql`](./supabase_rls_fix.sql). A Storage bucket named `stimulus-images` (public) is also required for image stimulus uploads.

## Configure environment

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project (Project Settings → API):

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is meant to be shipped to the browser — Row-Level Security on the database is what actually protects your data.

## Run locally

```bash
npm install
npm run dev
```

The dev server opens at http://localhost:5173.

Create your first researcher account in **Supabase → Authentication → Users → Add user**, then sign in at http://localhost:5173/login.

## Build & preview

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: **Vite**. Build command: `npm run build`. Output dir: `dist`.
4. Add the two env vars under **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. The included `vercel.json` rewrites every path to `/` so React Router handles deep links after a hard refresh.

After the first deploy, also add your Vercel URL to **Supabase → Authentication → URL Configuration → Site URL** so password reset / email-confirm links land on the right place.

## Data model

Four tables, all owned by the signed-in researcher (`owner_id = auth.uid()`):

- `sessions` — title, session_code, n-back distribution, timing, stimulus_set
- `subjects` — researcher-assigned IDs per session, progress status
- `game_results` — one row per game played, plus `trial_data` jsonb for per-trial detail
- `stimulus_sets` — reusable text or image stimulus libraries

Image stimuli upload to the public `stimulus-images` Storage bucket; the row stores the public URL.

## Swapping in a different backend

Every page calls through `src/api/base44Client.js`, which exposes a Base44-shaped surface (`base44.entities.X.{list,filter,get,create,bulkCreate,update,delete}`, `base44.integrations.Core.UploadFile`, `base44.auth.*`). To use a different backend (Firebase, your own REST API, etc.), reimplement only that file and `src/lib/supabase.js` — the rest of the app needs no changes.

## Auth

Researchers sign in with email + password via Supabase Auth. Participants don't need accounts — the `/play/:code/:subjectId` route is public and runs as the anon role. Row-Level Security on each table restricts what anon can read/write (read sessions, read subjects, insert game_results, update subject progress).
