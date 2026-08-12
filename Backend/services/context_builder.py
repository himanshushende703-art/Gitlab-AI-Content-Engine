from services.repository_reader import RepositoryReader
from retrieval.chroma_store import query_relevant


class ContextBuilder:

    def __init__(self):
        self.repository_reader = RepositoryReader()

    def build_context(
        self,
        source_text: str,
        project_id: int | None = None,
        uploaded_documents: list | None = None,
    ):
        """
        Build a complete source-grounded context package.

        Available Sources:
        - GitLab Repository
        - Uploaded Documents
        - Source Text
        - Chroma Knowledge Base
        """

        # -----------------------------
        # GitLab Repository Context
        # -----------------------------
        repository_context = None

        if project_id:
            repository_context = (
                self.repository_reader.build_repository_context(project_id)
            )

        # -----------------------------
        # Uploaded Documents
        # -----------------------------
        document_context = None

        if uploaded_documents:
            # TODO:
            # Extract PDF / DOCX text here.
            document_context = uploaded_documents

        # -----------------------------
        # Knowledge Base Retrieval
        # -----------------------------
        knowledge = query_relevant(
            source_text,
            n_results=5,
        )

        # -----------------------------
        # Repository Summary
        # -----------------------------
        repository_summary = None

        if repository_context:

            commits = repository_context.get("commits", [])[:5]
            merge_requests = repository_context.get("merge_requests", [])[:5]
            issues = repository_context.get("issues", [])[:5]

            projects = repository_context.get("projects", [])
            branches = repository_context.get("branches", [])

            repository_summary = {
                "repository_name": (
                    projects[0]["name"] if projects else None
                ),

                "default_branch": (
                    branches[0]["name"] if branches else None
                ),

                "readme": repository_context.get("readme"),

                "recent_commits": [
                    commit.get("title")
                    for commit in commits
                ],

                "merge_requests": [
                    mr.get("title")
                    for mr in merge_requests
                ],

                "issues": [
                    issue.get("title")
                    for issue in issues
                ],
            }

        # -----------------------------
        # Final Context Package
        # -----------------------------
        return {
            "repository": repository_context,
            "repository_summary": repository_summary,
            "documents": document_context,
            "knowledge": knowledge,
            "source_text": source_text,
        }