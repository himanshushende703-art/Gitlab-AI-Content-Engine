# Environment Setup Summary

## Backend (`backend/.env`)

| Variable | Where to get it | Required |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey (free) | Yes |
| `GOOGLE_API_KEY` | Same value as `GEMINI_API_KEY` (some libraries look for this name) | Yes |
| `DATABASE_URL` | Supabase project → Project Settings → Database → Connection string (URI) | Yes |

## Frontend (`frontend/.env.local`)

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Local: `http://127.0.0.1:8000`. Deployed: your Render/Railway URL | Yes |

## Never commit these files
Both `.env` and `.env.local` are already listed in `.gitignore`. Only
the `.env.example` / `.env.local.example` templates should be committed.
