# Content Template: API Reference

Use this structure when drafting API reference content.

## Required Sections

1. **Endpoint** — HTTP method and path, e.g. `POST /api/v4/projects`.
2. **Description** — one sentence on what the endpoint does.
3. **Parameters** — table of name, type, required/optional, description.
4. **Example request** — a realistic curl or code example.
5. **Example response** — realistic JSON response body.
6. **Errors** — common error codes and what they mean.

## Rules

- Never invent a parameter name or type that isn't in the source material.
- If the source material doesn't specify a field's data type, mark it as
  an assumption rather than guessing.
