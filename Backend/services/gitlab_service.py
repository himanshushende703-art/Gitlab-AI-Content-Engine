import os
import requests
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

GITLAB_URL = os.getenv("GITLAB_URL")
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN")


class GitLabService:
    def __init__(self):
        self.base_url = GITLAB_URL
        self.headers = {
            "PRIVATE-TOKEN": GITLAB_TOKEN
        }

    def get_project(self, project_id: int):
        """
        Fetch a single GitLab project by project ID.
        Used to determine the project's actual default branch.
        """
        url = f"{self.base_url}/projects/{project_id}"

        response = requests.get(
            url,
            headers=self.headers,
        )

        response.raise_for_status()

        return response.json()

    def get_projects(self):
        """
        Fetch all projects accessible by the authenticated user.
        """
        url = f"{self.base_url}/projects"

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "membership": True,
                "per_page": 100
            }
        )

        response.raise_for_status()

        return response.json()

    def get_repository_tree(self, project_id: int):
        """
        Fetch repository files and folders.
        """
        url = f"{self.base_url}/projects/{project_id}/repository/tree"

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "recursive": True,
                "per_page": 1000,
            },
        )

        response.raise_for_status()

        return response.json()

    def get_file_content(
        self,
        project_id: int,
        file_path: str,
        ref: str = None,
    ):
        """
        Fetch raw content of a file from GitLab.

        If the file does not exist, return None instead of
        crashing the entire context-building process.
        """

        encoded_path = urllib.parse.quote(file_path, safe="")

        url = (
            f"{self.base_url}/projects/"
            f"{project_id}/repository/files/"
            f"{encoded_path}/raw"
        )

        # If no branch/ref is supplied, automatically detect
        # the project's default branch.
        if not ref:
            project = self.get_project(project_id)
            ref = project.get("default_branch") or "main"

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "ref": ref
            },
        )

        # README or another optional file may not exist.
        # Do not crash the entire context builder.
        if response.status_code == 404:
            return None

        response.raise_for_status()

        return response.text

    def get_branches(self, project_id: int):
        """
        Fetch all branches from GitLab repository.
        """
        url = f"{self.base_url}/projects/{project_id}/repository/branches"

        response = requests.get(
            url,
            headers=self.headers,
        )

        response.raise_for_status()

        return response.json()

    def get_commits(self, project_id: int):
        """
        Fetch recent commits.
        """
        url = f"{self.base_url}/projects/{project_id}/repository/commits"

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "per_page": 20
            },
        )

        response.raise_for_status()

        return response.json()

    def get_merge_requests(self, project_id: int):
        """
        Fetch merge requests for a project.
        """
        url = f"{self.base_url}/projects/{project_id}/merge_requests"

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "per_page": 20
            },
        )

        response.raise_for_status()

        return response.json()

    def get_issues(self, project_id: int):
        """
        Fetch issues for a project.
        """
        url = f"{self.base_url}/projects/{project_id}/issues"

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "per_page": 20
            },
        )

        response.raise_for_status()

        return response.json()