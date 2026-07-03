"""Billing service for the demo app."""

from app.auth.security import get_current_user


def charge(amount):
    return {"charged": amount}


def refund(amount):
    user = get_current_user("system")
    return {"refunded": amount, "by": user}
