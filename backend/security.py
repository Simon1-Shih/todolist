import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, make_response, request

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
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=current_app.config['ACCESS_TOKEN_EXPIRES_SECONDS']
    )
    access_token = jwt.encode(
        {
            'sub': str(user_payload['id']),
            'email': user_payload['email'],
            'csrf': csrf_token,
            'iss': 'focusflow-api',
            'aud': 'focusflow-web',
            'iat': datetime.now(timezone.utc),
            'exp': expires_at,
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256',
    )

    # HttpOnly: JS 不能讀取，降低 XSS 偷 token 的殺傷力。
    response.set_cookie(
        _access_cookie_name(),
        access_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
        expires=expires_at,
        path='/',
    )
    # 非 HttpOnly：React 需要讀取後放入 X-CSRF-Token header。
    response.set_cookie(
        _csrf_cookie_name(),
        csrf_token,
        httponly=False,
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
        expires=expires_at,
        path='/',
    )
    return response


def create_auth_response(user_payload, status=200):
    response = make_response({'success': True, 'data': user_payload}, status)
    return set_auth_cookies(response, user_payload)


def clear_auth_response(payload=None, status=200):
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
    csrf_from_jwt = claims.get('csrf')
    csrf_from_cookie = request.cookies.get(_csrf_cookie_name())
    csrf_from_header = request.headers.get('X-CSRF-Token')

    if not csrf_from_jwt or not csrf_from_cookie or not csrf_from_header:
        return jsonify({'success': False, 'error': 'CSRF token is required'}), 403

    if not (
        secrets.compare_digest(csrf_from_jwt, csrf_from_cookie)
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
