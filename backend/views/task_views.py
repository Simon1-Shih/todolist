from flask import Blueprint, current_app, jsonify, redirect, request, session
from backend.auth import oauth
from backend.models import db
from backend.models.category import Category
from backend.models.notification import Notification
from backend.models.notification_dismissal import NotificationDismissal
from backend.models.task import Task
from backend.models.user import User
from backend.controllers.task_controller import TaskController
from backend.controllers.category_controller import CategoryController
from backend.security import (
    clear_auth_response,
    current_user_id,
    load_current_user,
    require_csrf,
    set_auth_cookies,
)

api_bp = Blueprint('api', __name__)


@api_bp.before_request
def require_auth():
    if request.method == 'OPTIONS':
        return None

    public_endpoints = {'api.auth_google', 'api.auth_google_callback', 'api.auth_me', 'api.auth_debug'}
    if request.endpoint in public_endpoints:
        return None

    if not load_current_user():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    return require_csrf()


def get_app_base_url():
    return (current_app.config.get('APP_BASE_URL') or request.host_url.rstrip('/')).rstrip('/')


def get_frontend_base_url():
    return (current_app.config.get('FRONTEND_BASE_URL') or get_app_base_url()).rstrip('/')


def ensure_user(user_info):
    email = (user_info.get('email') or '').strip().lower()
    if not email:
        raise ValueError('Google account did not return an email address')

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email)
        db.session.add(user)

    user.name = user_info.get('name') or user.name or ''
    user.picture = user_info.get('picture') or user.picture or ''
    db.session.commit()
    return user


def assign_unowned_data_to_user(user_id):
    Task.query.filter(Task.user_id.is_(None)).update({'user_id': user_id})
    Category.query.filter(Category.user_id.is_(None)).update({'user_id': user_id})
    db.session.commit()


@api_bp.route('/auth/me', methods=['GET'])
def auth_me():
    user = load_current_user()
    return jsonify({'success': True, 'data': user.to_dict() if user else None})


@api_bp.route('/auth/debug', methods=['GET'])
def auth_debug():
    session_cookie_name = current_app.config.get('SESSION_COOKIE_NAME', 'session')
    csrf_cookie_name = current_app.config.get('CSRF_COOKIE_NAME', 'csrf_token')
    return jsonify({
        'success': True,
        'data': {
            'host': request.host,
            'isSecure': request.is_secure,
            'sessionCookieName': session_cookie_name,
            'hasSessionCookie': session_cookie_name in request.cookies,
            'hasCsrfCookie': csrf_cookie_name in request.cookies,
            'sessionHasUser': bool(session.get('user')),
            'sessionHasCsrf': bool(session.get('csrf_token')),
            'sessionCookieSecure': current_app.config.get('SESSION_COOKIE_SECURE'),
            'sessionCookieSameSite': current_app.config.get('SESSION_COOKIE_SAMESITE'),
            'frontendBaseUrlConfigured': bool(current_app.config.get('FRONTEND_BASE_URL')),
            'appBaseUrlConfigured': bool(current_app.config.get('APP_BASE_URL')),
        },
    })


@api_bp.route('/auth/google', methods=['GET'])
def auth_google():
    if not current_app.config.get('GOOGLE_CLIENT_ID') or not current_app.config.get('GOOGLE_CLIENT_SECRET'):
        return jsonify({'success': False, 'error': 'Google OAuth is not configured'}), 500
    redirect_uri = f"{get_app_base_url()}/api/auth/google/callback"
    return oauth.google.authorize_redirect(redirect_uri)


@api_bp.route('/auth/google/callback', methods=['GET'])
def auth_google_callback():
    token = oauth.google.authorize_access_token()
    user_info = token.get('userinfo') or oauth.google.userinfo()
    user = ensure_user({
        'email': user_info.get('email'),
        'name': user_info.get('name'),
        'picture': user_info.get('picture'),
    })
    assign_unowned_data_to_user(user.id)
    response = redirect(get_frontend_base_url())
    return set_auth_cookies(response, user.to_dict())


@api_bp.route('/auth/logout', methods=['POST'])
def auth_logout():
    return clear_auth_response({'success': True})

# ========== Task APIs ==========

@api_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """取得任務列表"""
    filter_type = request.args.get('filter', 'all')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'asc')

    tasks = TaskController.get_all(
        user_id=current_user_id(),
        filter_type=filter_type,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return jsonify({'success': True, 'data': tasks, 'message': 'Tasks retrieved successfully'})


@api_bp.route('/users/search', methods=['GET'])
def search_users():
    query = (request.args.get('q') or '').strip()
    if not query:
        return jsonify({'success': True, 'data': []})

    like = f'%{query}%'
    users = User.query.filter(
        User.id != current_user_id(),
        (User.name.ilike(like)) | (User.email.ilike(like)),
    ).order_by(User.name.asc(), User.email.asc()).limit(5).all()
    return jsonify({'success': True, 'data': [user.to_dict() for user in users]})


@api_bp.route('/users/<int:user_id>/availability', methods=['GET'])
def get_user_availability(user_id):
    due_date = (request.args.get('dueDate') or '').strip()
    if not due_date:
        return jsonify({'success': False, 'error': 'dueDate is required', 'status_code': 400}), 400
    if not User.query.get(user_id):
        return jsonify({'success': False, 'error': 'User not found', 'status_code': 404}), 404

    data = TaskController.get_availability(current_user_id(), user_id, due_date)
    return jsonify({'success': True, 'data': data})


@api_bp.route('/users/<int:user_id>/tasks', methods=['GET'])
def get_user_tasks(user_id):
    if not User.query.get(user_id):
        return jsonify({'success': False, 'error': 'User not found', 'status_code': 404}), 404

    tasks = TaskController.get_all(
        user_id=user_id,
        filter_type='all',
        search='',
        sort_by='date',
        sort_order='asc',
    )
    if user_id != current_user_id():
        masked_tasks = []
        for task in tasks:
            if task.get('requesterId') == current_user_id():
                masked_tasks.append(task)
                continue

            masked_tasks.append({
                **task,
                'title': '他人委託' if task.get('requesterId') else '常規工作',
                'description': '',
                'categoryIds': [],
                'priority': '',
                'recurrence': 'none',
                'requester': None,
                'assignee': None,
            })
        tasks = masked_tasks
    return jsonify({'success': True, 'data': tasks})


@api_bp.route('/users/<int:user_id>/categories', methods=['GET'])
def get_user_categories(user_id):
    if not User.query.get(user_id):
        return jsonify({'success': False, 'error': 'User not found', 'status_code': 404}), 404

    categories = CategoryController.get_all(user_id)
    return jsonify({'success': True, 'data': [category.to_dict() for category in categories]})


@api_bp.route('/notifications', methods=['GET'])
def get_notifications():
    TaskController.create_overdue_notifications(current_user_id())
    notifications = Notification.query.filter(Notification.user_id == current_user_id()).order_by(Notification.created_at.desc()).limit(30).all()
    return jsonify({'success': True, 'data': [notification.to_dict() for notification in notifications]})


@api_bp.route('/notifications/read', methods=['PATCH'])
def mark_notifications_read():
    Notification.query.filter(Notification.user_id == current_user_id(), Notification.read == False).update({'read': True})
    db.session.commit()
    return jsonify({'success': True, 'data': {'read': True}})


def dismiss_notification(notification):
    exists = NotificationDismissal.query.filter(
        NotificationDismissal.user_id == notification.user_id,
        NotificationDismissal.task_id == notification.task_id,
        NotificationDismissal.status == notification.status,
    ).first()
    if not exists:
        db.session.add(NotificationDismissal(
            user_id=notification.user_id,
            task_id=notification.task_id,
            status=notification.status,
        ))


@api_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    notification = Notification.query.filter(
        Notification.id == notification_id,
        Notification.user_id == current_user_id(),
    ).first()
    if not notification:
        return jsonify({'success': False, 'error': 'Notification not found', 'status_code': 404}), 404

    dismiss_notification(notification)
    db.session.delete(notification)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': notification_id}})


@api_bp.route('/notifications', methods=['DELETE'])
def clear_notifications():
    notifications = Notification.query.filter(Notification.user_id == current_user_id()).all()
    deleted = len(notifications)
    for notification in notifications:
        dismiss_notification(notification)
        db.session.delete(notification)
    db.session.commit()
    return jsonify({'success': True, 'data': {'deleted': deleted}})


@api_bp.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """取得單一任務"""
    task = TaskController.get_by_id(current_user_id(), task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task, 'message': 'Task retrieved successfully'})


@api_bp.route('/tasks', methods=['POST'])
def create_task():
    """建立新任務"""
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'success': False, 'error': 'Title is required', 'status_code': 400}), 400
    if not data.get('date'):
        return jsonify({'success': False, 'error': 'Date is required', 'status_code': 400}), 400
    assignee_id = int(data.get('assigneeId') or current_user_id())
    if assignee_id != current_user_id():
        if not data.get('estimatedTime'):
            return jsonify({'success': False, 'error': 'Estimated time is required for delegated tasks', 'status_code': 400}), 400
        availability = TaskController.get_availability(current_user_id(), assignee_id, data['date'])
        requested_hours = int(data.get('estimatedTime') or 0) / 60
        if availability['dayHours'] + requested_hours > 8:
            return jsonify({'success': False, 'error': 'Assignee is over the 8 hour daily limit', 'status_code': 400}), 400

    task, error = TaskController.create(current_user_id(), data)
    if error:
        return jsonify({'success': False, 'error': error, 'status_code': 400}), 400
    if not task:
        return jsonify({'success': False, 'error': 'Assignee not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': TaskController._to_dict_with_categories(task), 'message': 'Task created successfully'}), 201


@api_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """更新任務"""
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'success': False, 'error': 'Title is required', 'status_code': 400}), 400

    task, error = TaskController.update(current_user_id(), task_id, data)
    if error and error != 'Task not found':
        return jsonify({'success': False, 'error': error, 'status_code': 400}), 400
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': TaskController._to_dict_with_categories(task), 'message': 'Task updated successfully'})


@api_bp.route('/tasks/<int:task_id>/toggle-complete', methods=['PATCH'])
def toggle_complete(task_id):
    """切換完成狀態"""
    res = TaskController.toggle_complete(current_user_id(), task_id)
    if not res:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    
    task, created_task = res
    response_data = {
        'success': True,
        'data': TaskController._to_dict_with_categories(task),
        'message': 'Completion status toggled'
    }
    if created_task:
        response_data['createdTask'] = TaskController._to_dict_with_categories(created_task)
        
    return jsonify(response_data)


@api_bp.route('/tasks/<int:task_id>/toggle-important', methods=['PATCH'])
def toggle_important(task_id):
    """切換重要狀態"""
    task = TaskController.toggle_important(current_user_id(), task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': TaskController._to_dict_with_categories(task), 'message': 'Important status toggled'})


@api_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """將任務移至垃圾桶 (軟刪除)"""
    task = TaskController.delete(current_user_id(), task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': TaskController._to_dict_with_categories(task), 'message': 'Task moved to trash'})


@api_bp.route('/tasks/purge', methods=['DELETE'])
def purge_all_tasks():
    """清空垃圾桶"""
    count = TaskController.purge_all(current_user_id())
    return jsonify({'success': True, 'data': {'purged': count}, 'message': f'{count} tasks permanently deleted'})


@api_bp.route('/tasks/<int:task_id>/purge', methods=['DELETE'])
def purge_single_task(task_id):
    """永久刪除單一已刪除任務"""
    count = TaskController.purge_one(current_user_id(), task_id)
    if count == 1:
        return jsonify({'success': True, 'data': {'purged': 1}, 'message': f'Task {task_id} permanently deleted'})
    else:
        return jsonify({'success': False, 'error': 'Task not found or not in trash', 'status_code': 404}), 404


@api_bp.route('/tasks/<int:task_id>/restore', methods=['PATCH'])
def restore_task(task_id):
    """將任務從垃圾桶還原"""
    task = TaskController.restore(current_user_id(), task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': TaskController._to_dict_with_categories(task), 'message': 'Task restored from trash'})


# ========== Category APIs ==========

@api_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = CategoryController.get_all(current_user_id())
    return jsonify({'success': True, 'data': [c.to_dict() for c in categories], 'message': 'Categories retrieved successfully'})

@api_bp.route('/categories/<int:cat_id>', methods=['GET'])
def get_category(cat_id):
    category = CategoryController.get_by_id(current_user_id(), cat_id)
    if not category:
        return jsonify({'success': False, 'error': 'Category not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category retrieved successfully'})

@api_bp.route('/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    if not data or not data.get('label'):
        return jsonify({'success': False, 'error': 'Label is required', 'status_code': 400}), 400

    category = CategoryController.create(current_user_id(), data)
    return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category created successfully'}), 201

@api_bp.route('/categories/<int:cat_id>', methods=['PUT'])
def update_category(cat_id):
    data = request.get_json()
    if not data or not data.get('label'):
        return jsonify({'success': False, 'error': 'Label is required', 'status_code': 400}), 400

    category = CategoryController.update(current_user_id(), cat_id, data)
    if not category:
        return jsonify({'success': False, 'error': 'Category not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category updated successfully'})

@api_bp.route('/categories/<int:cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    success = CategoryController.delete(current_user_id(), cat_id)
    if not success:
        return jsonify({'success': False, 'error': 'Category not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': {'id': cat_id}, 'message': 'Category deleted successfully'})
