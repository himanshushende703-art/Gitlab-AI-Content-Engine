# GitLab Voice and Style Guide (Sample)

## Tone Principles

Write in a direct, confident, and helpful tone. Avoid marketing fluff
and exaggerated claims like "revolutionary" or "game-changing." Prefer
plain statements of what changed and why it matters to the reader.

## Audience Adjustments

- **Developers**: Use precise technical terms. Assume familiarity with
  Git, CLI tools, and APIs. Skip basic explanations.
- **Internal team**: Can reference internal project names and short-form
  jargon. Keep it concise.
- **Customers**: Avoid internal jargon. Explain the "why" behind a
  change, not just the "what."

## Structure Rules

- Every release note should start with a one-sentence summary of the change.
- Use active voice: "We added X" not "X was added."
- Breaking changes must be clearly labeled with a "Breaking Change" heading.
- API reference content must include the endpoint, method, parameters,
  and at least one example request/response.

## Terminology

- Say "merge request," not "pull request" (GitLab-specific terminology).
- Say "pipeline," not "build job," when referring to CI/CD runs.
- Refer to the product as "GitLab," not "Gitlab" or "GITLAB."

## Prohibited Patterns

- Do not state a feature is "available to all users" unless the source
  material explicitly confirms rollout scope.
- Do not invent performance numbers (e.g. "50% faster") unless the source
  material provides a specific measured figure.
