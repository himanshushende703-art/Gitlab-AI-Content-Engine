# Runner Configuration Basics (Sample Existing Doc)

GitLab Runners execute the jobs defined in a pipeline. Runners can be
shared (managed by GitLab) or self-hosted (managed by your organization).

## Runner Flags

The `gitlab-runner exec` command lets you run a job locally before
pushing, which is useful for debugging CI configuration without
consuming pipeline minutes. Common flags include `--env` to set
environment variables and configuration overrides for local testing.

## Registration

Runners must be registered with a registration token before they can
pick up jobs. Tokens are scoped to a project, group, or the whole
instance depending on how the runner should be shared.

## Tags

Jobs can be restricted to specific runners using tags. A job with
`tags: [docker, linux]` will only run on runners registered with both
of those tags.
