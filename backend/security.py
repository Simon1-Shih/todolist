import secrets
from functools import wraps

import jwt
from flask import current_app, g, jsonify, make_response, request, session

from backend.models.user import User


def _cookie_secure():
    return bool(current_app.config.get('SESSION_COOKIE_SECURE'))


def _cookie_samesite():
    return current_app.config.get('SESSION_COOKIE_SAMESITE', 'Lax')


def _access_cookie_name():
    return current_app.config.get('ACCESS_COOKIE_NAME', 'access_token')


def _csrf_cookie_name():
    return current_app.config.get('CSRF_COOKIE_NAME', 'csrf_token')


def _decode_access_token(token):
    return jwt.decode(
        token,
        current_app.config['SECRET_KEY'],
        algorithms=['HS256'],
        audience='focusflow-web',
        issuer='focusflow-api',
    )


def set_auth_cookies(response, user_payload):
    csrf_token = secrets.token_urlsafe(32)
    session.clear()
    session['user'] = user_payload
    session['csrf_token'] = csrf_token

    # Remove the older JWT cookie. The HttpOnly Flask session cookie now carries identity.
    response.delete_cookie(
        _access_cookie_name(),
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
        path='/',
    )

    # React reads this non-HttpOnly value and mirrors it in X-CSRF-Token.
    response.set_cookie(
        _csrf_cookie_name(),
        csrf_token,
        httponly=False,
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
        path='/',
    )
    return response


def create_auth_response(user_payload, status=200):
    response = make_response({'success': True, 'data': user_payload}, status)
    return set_auth_cookies(response, user_payload)


def clear_auth_response(payload=None, status=200):
    session.clear()
    response = make_response(payload or {'success': True}, status)
    for cookie_name in (_access_cookie_name(), _csrf_cookie_name()):
        response.delete_cookie(
            cookie_name,
            secure=_cookie_secure(),
            samesite=_cookie_samesite(),
            path='/',
        )
    return response


def load_current_user():
    session_user = session.get('user')
    if session_user and session_user.get('id'):
        user = User.query.get(int(session_user['id']))
        if not user:
            return None

        g.jwt_claims = {'csrf': session.get('csrf_token')}
        g.current_user = user
        return user

    # Backward compatibility for users who still have the short-lived JWT cookie.
    token = request.cookies.get(_access_cookie_name())
    if not token:
        return None

    try:
        claims = _decode_access_token(token)
        user_id = int(claims['sub'])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None

    user = User.query.get(user_id)
    if not user:
        return None

    g.jwt_claims = claims
    g.current_user = user
    return user


def current_user_id():
    return g.current_user.id


def require_csrf():
    if request.method in ('GET', 'HEAD', 'OPTIONS'):
        return None

    claims = getattr(g, 'jwt_claims', None) or {}
    csrf_from_session = session.get('csrf_token') or claims.get('csrf')
    csrf_from_cookie = request.cookies.get(_csrf_cookie_name())
    csrf_from_header = request.headers.get('X-CSRF-Token')

    if not csrf_from_session or not csrf_from_cookie or not csrf_from_header:
        return jsonify({'success': False, 'error': 'CSRF token is required'}), 403

    if not (
        secrets.compare_digest(csrf_from_session, csrf_from_cookie)
        and secrets.compare_digest(csrf_from_cookie, csrf_from_header)
    ):
        return jsonify({'success': False, 'error': 'Invalid CSRF token'}), 403

    return None


def csrf_protect(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        failure = require_csrf()
        if failure:
            return failure
        return view_func(*args, **kwargs)

    return wrapper
