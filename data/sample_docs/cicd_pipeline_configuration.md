# CI/CD Pipeline Configuration (Sample Existing Doc)

GitLab CI/CD pipelines are defined in a `.gitlab-ci.yml` file at the root
of your repository. A pipeline consists of one or more stages, and each
stage contains one or more jobs that run in parallel.

## Basic Structure

Stages run in the order they are defined. Jobs within the same stage run
in parallel by default. A pipeline only proceeds to the next stage if all
jobs in the current stage succeed, unless a job is marked as
`allow_failure: true`.

## Common Stages

A typical pipeline includes: `build`, `test`, `deploy`. Teams commonly
add a `lint` stage before `build` and a `review` stage before `deploy`
for staging environments.

## Variables

Pipeline variables can be defined at the project, group, or instance
level. Protected variables are only exposed to pipelines running on
protected branches or tags.

## Related Terminology

A "merge request pipeline" runs specifically in the context of a merge
request and can include additional validation jobs not present in
branch pipelines.
