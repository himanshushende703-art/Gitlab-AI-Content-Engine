from services.gitlab_service import GitLabService


class RepositoryReader:

    def __init__(self):
        self.gitlab = GitLabService()

    def build_repository_context(self, project_id: int):
        """
        Collect complete repository information from GitLab.
        """

        # Get the specific project first.
        project = self.gitlab.get_project(project_id)

        # Get all accessible projects.
        projects = self.gitlab.get_projects()

        tree = self.gitlab.get_repository_tree(project_id)

        branches = self.gitlab.get_branches(project_id)

        commits = self.gitlab.get_commits(project_id)

        merge_requests = self.gitlab.get_merge_requests(project_id)

        issues = self.gitlab.get_issues(project_id)

        # Use the project's real default branch.
        default_branch = project.get("default_branch") or "main"

        # README is optional.
        readme = self.gitlab.get_file_content(
            project_id,
            "README.md",
            ref=default_branch,
        )

        return {
            "projects": projects,
            "project": project,
            "repository_tree": tree,
            "branches": branches,
            "commits": commits,
            "merge_requests": merge_requests,
            "issues": issues,
            "readme": readme,
            "default_branch": default_branch,
        }