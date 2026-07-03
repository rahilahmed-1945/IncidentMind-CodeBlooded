"""Order routes for the demo app."""

from app.auth.security import get_current_user
from app.services.billing import charge


def place_order(request):
    user = get_current_user(request)
    result = charge(100)
    return {"order": result, "user": user}
