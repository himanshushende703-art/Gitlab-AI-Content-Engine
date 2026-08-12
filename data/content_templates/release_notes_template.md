# Content Template: Release Notes

Use this structure when drafting release notes.

## Required Sections

1. **One-line summary** — what changed, in plain language.
2. **Why it matters** — the problem this solves for the user.
3. **How to use it** — brief steps or a link to full documentation.
4. **Breaking changes** (if any) — clearly labeled, with a migration note.

## Example

**Summary**: Added a `--dry-run` flag to `gitlab-runner exec`.

**Why it matters**: Developers can now preview what a CI job would do
without actually executing it, catching configuration mistakes before
they consume pipeline minutes.

**How to use it**: Run `gitlab-runner exec docker my-job --dry-run`.

**Breaking changes**: None.
