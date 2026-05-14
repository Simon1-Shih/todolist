from flask import Blueprint, request, jsonify
from backend.controllers.task_controller import TaskController
from backend.controllers.category_controller import CategoryController

api_bp = Blueprint('api', __name__)

# ========== Task APIs ==========

@api_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """取得任務列表"""
    filter_type = request.args.get('filter', 'all')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'asc')

    tasks = TaskController.get_all(
        filter_type=filter_type,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return jsonify({'success': True, 'data': tasks, 'message': 'Tasks retrieved successfully'})


@api_bp.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """取得單一任務"""
    task = TaskController.get_by_id(task_id)
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

    task = TaskController.create(data)
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task created successfully'}), 201


@api_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """更新任務"""
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'success': False, 'error': 'Title is required', 'status_code': 400}), 400

    task = TaskController.update(task_id, data)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task updated successfully'})


@api_bp.route('/tasks/<int:task_id>/toggle-complete', methods=['PATCH'])
def toggle_complete(task_id):
    """切換完成狀態"""
    task = TaskController.toggle_complete(task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Completion status toggled'})


@api_bp.route('/tasks/<int:task_id>/toggle-important', methods=['PATCH'])
def toggle_important(task_id):
    """切換重要狀態"""
    task = TaskController.toggle_important(task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Important status toggled'})


@api_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """將任務移至垃圾桶 (軟刪除)"""
    task = TaskController.delete(task_id)
    if not task:
        return jsonify({'success': False, 'error': 'Task not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': task.to_dict(), 'message': 'Task moved to trash'})


@api_bp.route('/tasks/purge', methods=['DELETE'])
def purge_all_tasks():
    """清空垃圾桶"""
    count = TaskController.purge_all()
    return jsonify({'success': True, 'data': {'purged': count}, 'message': f'{count} tasks permanently deleted'})


@api_bp.route('/tasks/<int:task_id>/purge', methods=['DELETE'])
def purge_single_task(task_id):
    """永久刪除單一已刪除任務"""
    count = TaskController.purge_one(task_id)
    if count == 1:
        return jsonify({'success': True, 'data': {'purged': 1}, 'message': f'Task {task_id} permanently deleted'})
    else:
        return jsonify({'success': False, 'error': 'Task not found or not in trash', 'status_code': 404}), 404


# ========== Category APIs ==========

@api_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = CategoryController.get_all()
    return jsonify({'success': True, 'data': [c.to_dict() for c in categories], 'message': 'Categories retrieved successfully'})

@api_bp.route('/categories/<int:cat_id>', methods=['GET'])
def get_category(cat_id):
    category = CategoryController.get_by_id(cat_id)
    if not category:
        return jsonify({'success': False, 'error': 'Category not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category retrieved successfully'})

@api_bp.route('/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    if not data or not data.get('label'):
        return jsonify({'success': False, 'error': 'Label is required', 'status_code': 400}), 400

    category = CategoryController.create(data)
    return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category created successfully'}), 201

@api_bp.route('/categories/<int:cat_id>', methods=['PUT'])
def update_category(cat_id):
    data = request.get_json()
    if not data or not data.get('label'):
        return jsonify({'success': False, 'error': 'Label is required', 'status_code': 400}), 400

    category = CategoryController.update(cat_id, data)
    if not category:
        return jsonify({'success': False, 'error': 'Category not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category updated successfully'})

@api_bp.route('/categories/<int:cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    success = CategoryController.delete(cat_id)
    if not success:
        return jsonify({'success': False, 'error': 'Category not found', 'status_code': 404}), 404
    return jsonify({'success': True, 'data': {'id': cat_id}, 'message': 'Category deleted successfully'})
