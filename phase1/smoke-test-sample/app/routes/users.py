"""User routes for the demo app."""

from app.auth.security import get_current_user


def read_profile(request):
    user = get_current_user(request)
    return {"profile": user}
