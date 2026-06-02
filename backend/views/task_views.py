from flask import Blueprint, current_app, jsonify, redirect, request, session
from backend.auth import oauth
from backend.models import db
from backend.models.category import Category
from backend.models.task import Task
from backend.models.user import User
from backend.controllers.task_controller import TaskController
from backend.controllers.category_controller import CategoryController

api_bp = Blueprint('api', __name__)


@api_bp.before_request
def require_auth():
    if request.method == 'OPTIONS':
        return None
    if request.endpoint and request.endpoint.startswith('api.auth_'):
        return None
    if 'user' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    if not session['user'].get('id') and session['user'].get('email'):
        session['user'] = ensure_user(session['user']).to_dict()
    return None


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


def current_user_id():
    return session['user']['id']


@api_bp.route('/auth/me', methods=['GET'])
def auth_me():
    return jsonify({'success': True, 'data': session.get('user')})


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
    session['user'] = user.to_dict()
    return redirect(get_frontend_base_url())


@api_bp.route('/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'success': True})

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

    task = TaskController.create(current_user_id(), data)
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task created successfully'}), 201


@api_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """更新任務"""
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'success': False, 'error': 'Title is required', 'status_code': 400}), 400

    task = TaskController.update(current_user_id(), task_id, data)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task updated successfully'})


@api_bp.route('/tasks/<int:task_id>/toggle-complete', methods=['PATCH'])
def toggle_complete(task_id):
    """切換完成狀態"""
    res = TaskController.toggle_complete(current_user_id(), task_id)
    if not res:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    
    task, created_task = res
    response_data = {
        'success': True,
        'data': task.to_dict(),
        'message': 'Completion status toggled'
    }
    if created_task:
        response_data['createdTask'] = created_task.to_dict()
        
    return jsonify(response_data)


@api_bp.route('/tasks/<int:task_id>/toggle-important', methods=['PATCH'])
def toggle_important(task_id):
    """切換重要狀態"""
    task = TaskController.toggle_important(current_user_id(), task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Important status toggled'})


@api_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """將任務移至垃圾桶 (軟刪除)"""
    task = TaskController.delete(current_user_id(), task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task moved to trash'})


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
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task restored from trash'})


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
