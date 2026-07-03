"""Nightly maintenance tasks for the demo app."""

from app.auth.security import validate_token


def cleanup():
    ok = validate_token("cron")
    return ok
