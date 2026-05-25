# KAIROS — frontend (React + Vite)

The self-serve product UI for KAIROS. Drives the full loop — landing → address /
from-values → scan → categories → subscription → payment → onboarding → monthly
digest → account — against the FastAPI backend (`kairos-backend`). The activation
logic shown in the UI mirrors the backend engine, but the **backend is the source of
truth** (all scans/subscriptions/digests are persisted server-side).

## Run locally
```bash
npm install
npm run dev        # Vite dev server (HMR)
npm run build      # production build -> dist/
npm run preview    # serve the production build
npm run lint       # eslint
```

## Environment variables
Set these in `.env.local` for local dev, and in the hosting provider (e.g. Vercel) for
production. None contain secrets.

| Var | Purpose | Default |
|---|---|---|
| `VITE_API_BASE` | Base URL of the FastAPI backend | falls back to the live Render backend URL |
| `VITE_SUPPORT_EMAIL` | Support contact shown in the UI | falls back to a placeholder (`support@kairos.example`) — **set the real address for production** |

`.env*` files are gitignored — never commit real values.

## Backend contract
`src/api.js` is the single place that talks to the backend: env-driven base URL, a
fetch wrapper with a generous timeout (absorbs Render cold starts), and normalized
`{ok, data, error, status}` returns. Owner-scoped calls (cancel, digests) present the
capability token issued at subscription create/confirm as a `Bearer` header.
