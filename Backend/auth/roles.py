"""
auth/roles.py
--------------
Implements the "role-based access" requirement from the PRD (section
5.4 / 6.2). This is a deliberately SIMPLE version suitable for a student
project demo — not a full login system with passwords and sessions.

HOW IT WORKS:
Every request must include two headers:
    X-User-Name: "Priya"
    X-User-Role: "writer" | "technical_reviewer" | "doc_lead" | "admin"

Endpoints declare which roles are allowed to call them using the
`require_role(...)` dependency. If the header is missing or the role
isn't allowed, the API returns a 401/403 error instead of silently
allowing the action.

WHY NOT FULL LOGIN (JWT/passwords)?
A real login system is a substantial project on its own (password
hashing, sessions/tokens, signup flow, email verification). For an
MVP/demo, header-based roles satisfy the PRD's requirement of
"different permissions for content creators, technical reviewers,
documentation leads, and administrators" without that overhead. This is
clearly documented here so your team can swap in Supabase Auth or a
real JWT flow later without redesigning the rest of the app — every
protected endpoint already calls `require_role(...)`, so only this file
would need to change.

HOW THE FRONTEND SENDS THESE HEADERS:
See frontend/app/page.jsx — the fetch() calls include these two headers
on every request. In a real app, X-User-Name and X-User-Role would come
from a logged-in session instead of being typed in by the user.
"""

from enum import Enum

from fastapi import Header, HTTPException


class Role(str, Enum):
    writer = "writer"
    technical_reviewer = "technical_reviewer"
    doc_lead = "doc_lead"
    admin = "admin"


class CurrentUser:
    def __init__(self, name: str, role: Role):
        self.name = name
        self.role = role


def get_current_user(
    x_user_name: str = Header(..., description="Display name of the acting user"),
    x_user_role: str = Header(..., description="One of: writer, technical_reviewer, doc_lead, admin"),
) -> CurrentUser:
    try:
        role = Role(x_user_role)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid X-User-Role '{x_user_role}'. Must be one of: "
            f"{', '.join(r.value for r in Role)}",
        )
    return CurrentUser(name=x_user_name, role=role)


def require_role(*allowed_roles: Role):
    """
    Use as a FastAPI dependency to restrict an endpoint to specific roles:
        @app.post(...)
        def my_endpoint(user: CurrentUser = Depends(require_role(Role.admin))):
            ...
    """

    def _checker(
        x_user_name: str = Header(...),
        x_user_role: str = Header(...),
    ) -> CurrentUser:
        user = get_current_user(x_user_name=x_user_name, x_user_role=x_user_role)
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{user.role.value}' is not permitted to perform this action. "
                f"Allowed roles: {', '.join(r.value for r in allowed_roles)}",
            )
        return user

    return _checker
