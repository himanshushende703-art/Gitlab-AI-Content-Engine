# Deploying the Frontend (Vercel)

1. Push your repo to GitHub (if not already).
2. Go to https://vercel.com → sign in with GitHub → "Add New Project"
3. Select your repository.
4. **Important:** set the "Root Directory" to `Frontend` (Vercel needs
   to know the Next.js app isn't at the repo root).
5. Add an environment variable:
   - `NEXT_PUBLIC_API_BASE` = the URL of your deployed backend (see
     `backend_deployment.md`) — e.g. `https://your-app.onrender.com`
6. Click Deploy.
7. Once deployed, copy the public URL Vercel gives you (e.g.
   `https://gitlab-ai-content-engine.vercel.app`) — put this in your
   README under "Deployed application link."

## Common issue
If the deployed site can't reach the backend, check:
- The backend's CORS settings allow your Vercel domain (see `main.py`'s
  `CORSMiddleware` — for a real deployment, replace `allow_origins=["*"]`
  with your actual Vercel URL)
- `NEXT_PUBLIC_API_BASE` doesn't have a trailing slash
## Common issue

If the deployed site can't reach the backend, check:

- On Render, `FRONTEND_ORIGINS` is set to your exact Vercel URL (e.g. `https://your-app.vercel.app`, no trailing slash). The backend reads this env var to configure CORS (`main.py`'s `CORSMiddleware`) — if it's unset, only `localhost` is allowed and your deployed frontend will get CORS errors.
- `NEXT_PUBLIC_API_BASE` doesn't have a trailing slash