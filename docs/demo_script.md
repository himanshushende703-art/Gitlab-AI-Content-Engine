# Demo Script (for your submission video)

Aim for 3-5 minutes. Speak plainly — explain what you're doing and why
at each step.

## 1. Problem (30 seconds)
"GitLab ships updates constantly, and every update needs release notes,
docs, a blog post, sometimes an API reference — all written by hand. We
built a multi-agent AI system that drafts all of this automatically,
while keeping a human in control of what actually gets published."

## 2. Architecture (30 seconds)
Show `docs/architecture.md`'s diagram or draw it live. Mention: FastAPI
backend, PostgreSQL for storage, Chroma for retrieval, CrewAI for the
5-agent pipeline, Next.js frontend.

## 3. Live demo — Release Notes (90 seconds)
1. Open the app, set your name/role to "writer"
2. Content type: `release_notes`, audience: `developers`
3. Paste the sample input from `data/sample_inputs/dry_run_flag_update.md`
4. Click Generate Draft — narrate: "this is now running 5 agents:
   reading context, drafting, technical review, tone adjustment,
   packaging"
5. Show the resulting draft, and point out the `risk_flags` and
   `assumptions` sections — explain this is what makes it safe to trust

## 4. Switch role and review (45 seconds)
1. Change role to `technical_reviewer`
2. Walk through the draft, click Accept
3. Change role to `doc_lead`, run the export, show the Markdown output

## 5. Show a second content type (30 seconds)
Repeat quickly with `content_type: api_reference` or `blog` to show the
same pipeline adapts tone/structure per content type.

## 6. Show the knowledge base grounding (30 seconds)
Open `data/style_guides/gitlab_voice_guide.md` and point out a rule
(e.g. "merge request not pull request") — then show that rule reflected
in the generated draft's terminology. This demonstrates retrieval is
actually influencing output, not just decoration.

## 7. Wrap-up (15 seconds)
Mention team roles/contributions and what you'd build next (real auth,
CMS publishing integration, prompt versioning UI).
