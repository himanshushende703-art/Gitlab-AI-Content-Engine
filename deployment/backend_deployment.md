# Deploying the Backend (Render or Railway)

Either service works the same way; steps below use Render.

1. Push your repo to GitHub.
2. Go to https://render.com → sign in → "New" → "Web Service"
3. Connect your repository.
4. Settings:
   - **Root Directory:** `Backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as your local `Backend/.env`):
    - `GEMINI_API_KEY`
   - `GOOGLE_API_KEY`
   - `DATABASE_URL` (your Supabase connection string)
   - `GITLAB_URL`
   - `GITLAB_TOKEN`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USERNAME`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`
   - `FRONTEND_ORIGINS` — leave this blank for now; you'll set it in
     step 9 below, once you know your Vercel URL. Until it's set, it
     defaults to `http://localhost:3000` only, so your deployed
     frontend will get CORS errors calling this backend.
6. Click "Create Web Service." First deploy takes a few minutes.
7. Once live, Render gives you a URL like `https://your-app.onrender.com`
   — test it by visiting `https://your-app.onrender.com/docs`
8. Copy this URL into your frontend's `NEXT_PUBLIC_API_BASE` environment
   variable on Vercel (see `vercel_notes.md`), then redeploy the frontend.
9. Once you have your Vercel URL, come back to Render → Environment →
   set `FRONTEND_ORIGINS` to your Vercel URL (e.g.
   `https://your-app.vercel.app`) and redeploy the backend.   

## Important: run the knowledge ingest script once after deploying
Chroma's data folder (`Backend/chroma_data/`) is local to the deployed
instance. After your first deploy, use Render's "Shell" tab (or a
one-off job) to run:
```
python -m retrieval.ingest_knowledge
```
Otherwise the deployed backend's knowledge base will be empty even
though your local one has data.