"""Auth primitives for the demo app."""


def get_current_user(token):
    user = {"token": token}
    return user


def validate_token(token):
    return bool(token)
