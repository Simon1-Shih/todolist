from backend.models import db
from backend.models.task import Task
from backend.models.category import Category
from datetime import date
from sqlalchemy import case

class TaskController:
    @staticmethod
    def _get_categories_for_task(task):
        """取得任務關聯的分類 IDs"""
        return [cat.id for cat in task.categories.all()]

    @staticmethod
    def get_all(filter_type='all', search='', sort_by='date', sort_order='asc'):
        tasks = Task.query

        if filter_type == 'trash':
            tasks = tasks.filter(Task.is_deleted == True)
        elif filter_type == 'full':
            # 不過濾 is_deleted，返回全部
            pass
        else:
            tasks = tasks.filter(Task.is_deleted == False)

        if filter_type == 'today':
            today = date.today().isoformat()
            tasks = tasks.filter(Task.date == today)
        elif filter_type == 'important':
            tasks = tasks.filter(Task.important == True)
        elif filter_type == 'completed':
            tasks = tasks.filter(Task.completed == True)
        elif filter_type.startswith('category-'):
            cat_id = filter_type.replace('category-', '')
            try:
                cat_id_int = int(cat_id)
                tasks = tasks.filter(Task.categories.any(Category.id == cat_id_int))
            except ValueError:
                pass

        if search:
            tasks = tasks.filter(Task.title.ilike(f'%{search}%'))

        if sort_by == 'priority':
            priority_order = {'High': 1, 'Medium': 2, 'Low': 3}
            priority_case = case(
                *( (Task.priority == k, v) for k, v in priority_order.items() ),
                else_=4
            )
            tasks = tasks.order_by(priority_case if sort_order == 'asc' else priority_case.desc())
        elif sort_by == 'time':
            tasks = tasks.order_by(Task.time if sort_order == 'asc' else Task.time.desc())
        else:
            tasks = tasks.order_by(Task.date if sort_order == 'asc' else Task.date.desc())

        result = []
        for t in tasks.all():
            d = t.to_dict()
            d['categoryIds'] = TaskController._get_categories_for_task(t)
            result.append(d)
        return result

    @staticmethod
    def get_by_id(task_id):
        task = Task.query.get(task_id)
        if not task:
            return None
        d = task.to_dict()
        d['categoryIds'] = TaskController._get_categories_for_task(task)
        return d

    @staticmethod
    def create(data):
        task = Task(
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data.get('time'),
            estimated_time=int(data['estimatedTime']) if data.get('estimatedTime') else None,
            priority=data.get('priority', 'Medium'),
            completed=False,
            important=False,
            is_deleted=False
        )
        db.session.add(task)
        db.session.flush()
        category_ids = data.get('categoryIds', [])
        if isinstance(category_ids, list) and category_ids:
            categories = Category.query.filter(Category.id.in_(category_ids)).all()
            task.categories.extend(categories)
        db.session.commit()
        return task

    @staticmethod
    def update(task_id, data):
        task = Task.query.get(task_id)
        if not task:
            return None
            
        task.title = data.get('title', task.title)
        task.description = data.get('description', task.description)
        task.date = data.get('date', task.date)
        task.time = data.get('time', task.time)
        
        if data.get('estimatedTime'):
            task.estimated_time = int(data['estimatedTime'])
            
        task.priority = data.get('priority', task.priority)
        
        category_ids = data.get('categoryIds', [])
        if isinstance(category_ids, list):
            task.categories = Category.query.filter(Category.id.in_(category_ids)).all()
            
        db.session.commit()
        return task

    @staticmethod
    def toggle_complete(task_id):
        task = Task.query.get(task_id)
        if not task: return None
        task.completed = not task.completed
        db.session.commit()
        return task

    @staticmethod
    def toggle_important(task_id):
        task = Task.query.get(task_id)
        if not task: return None
        task.important = not task.important
        db.session.commit()
        return task

    @staticmethod
    def delete(task_id):
        task = Task.query.get(task_id)
        if not task:
            return None
        task.is_deleted = True
        db.session.commit()
        return task

    @staticmethod
    def purge_all():
        trash_tasks = Task.query.filter(Task.is_deleted == True).all()
        count = len(trash_tasks)
        for task in trash_tasks:
            db.session.delete(task)
        db.session.commit()
        return count
        
    @staticmethod
    def purge_one(task_id):
        task = Task.query.get(task_id)
        if not task or not task.is_deleted:
            return 0
        db.session.delete(task)
        db.session.commit()
        return 1
