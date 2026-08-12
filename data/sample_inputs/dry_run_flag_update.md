# Sample Input: Dry-Run Flag Update

Feature: Added a new `--dry-run` flag to `gitlab-runner exec`.

Details: When set, the runner prints the steps it would execute without
actually running the job. This helps developers debug CI configuration
locally before pushing to a shared pipeline and consuming pipeline
minutes. No changes to existing flags. No breaking changes.

Target audience: developers
Content type: release_notes
