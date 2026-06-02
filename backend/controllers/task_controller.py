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
    def get_all(user_id, filter_type='all', search='', sort_by='date', sort_order='asc'):
        tasks = Task.query.filter(Task.user_id == user_id)

        if filter_type == 'trash':
            tasks = tasks.filter(Task.is_deleted == True)
        elif filter_type == 'full':
            # 不過濾 is_deleted，返回全部
            pass
        else:
            tasks = tasks.filter(Task.is_deleted == False)

        if filter_type == 'today':
            today = date.today().isoformat()
            tasks = tasks.filter((Task.date == today) | ((Task.date < today) & (Task.completed == False)))
        elif filter_type == 'important':
            tasks = tasks.filter(Task.important == True)
        elif filter_type == 'completed':
            tasks = tasks.filter(Task.completed == True)
        elif filter_type.startswith('category-'):
            cat_id = filter_type.replace('category-', '')
            try:
                cat_id_int = int(cat_id)
                tasks = tasks.filter(Task.categories.any((Category.id == cat_id_int) & (Category.user_id == user_id)))
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
    def get_by_id(user_id, task_id):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            return None
        d = task.to_dict()
        d['categoryIds'] = TaskController._get_categories_for_task(task)
        return d

    @staticmethod
    def create(user_id, data):
        task = Task(
            user_id=user_id,
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data.get('time'),
            estimated_time=int(data['estimatedTime']) if data.get('estimatedTime') else None,
            priority=data.get('priority', 'Medium'),
            completed=False,
            important=False,
            is_deleted=False,
            recurrence=data.get('recurrence', 'none')
        )
        db.session.add(task)
        db.session.flush()
        category_ids = data.get('categoryIds', [])
        if isinstance(category_ids, list) and category_ids:
            categories = Category.query.filter(Category.id.in_(category_ids), Category.user_id == user_id).all()
            task.categories.extend(categories)
        db.session.commit()
        return task

    @staticmethod
    def update(user_id, task_id, data):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            return None
            
        task.title = data.get('title', task.title)
        task.description = data.get('description', task.description)
        task.date = data.get('date', task.date)
        task.time = data.get('time', task.time)
        
        if data.get('estimatedTime'):
            task.estimated_time = int(data['estimatedTime'])
            
        task.priority = data.get('priority', task.priority)
        task.recurrence = data.get('recurrence', task.recurrence)
        
        category_ids = data.get('categoryIds', [])
        if isinstance(category_ids, list):
            task.categories = Category.query.filter(Category.id.in_(category_ids), Category.user_id == user_id).all()
            
        db.session.commit()
        return task

    @staticmethod
    def _calculate_next_recurrence_date(current_date_str, recurrence):
        import datetime
        import calendar
        
        today = datetime.date.today()
        try:
            curr_date = datetime.datetime.strptime(current_date_str, '%Y-%m-%d').date()
        except ValueError:
            curr_date = today
            
        next_date = curr_date
        
        def add_one_month(sourcedate):
            month = sourcedate.month - 1 + 1
            year = sourcedate.year + month // 12
            month = month % 12 + 1
            day = min(sourcedate.day, calendar.monthrange(year, month)[1])
            return datetime.date(year, month, day)

        while True:
            if recurrence == 'daily':
                next_date += datetime.timedelta(days=1)
            elif recurrence == 'weekly':
                next_date += datetime.timedelta(days=7)
            elif recurrence == 'monthly':
                next_date = add_one_month(next_date)
            else:
                break
            
            if next_date > today:
                break
                
        return next_date.isoformat()

    @staticmethod
    def toggle_complete(user_id, task_id):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            return None
            
        was_completed = task.completed
        task.completed = not task.completed
        
        created_task = None
        
        # 僅在任務完成 (completed 從 False 變為 True)，且 recurrence 不是 'none' 時觸發生成新任務
        if not was_completed and task.completed and task.recurrence != 'none':
            next_date = TaskController._calculate_next_recurrence_date(task.date, task.recurrence)
            
            # 等冪性檢查：避免對同一個重複週期產生多個未完成任務
            exists = Task.query.filter(
                Task.title == task.title,
                Task.user_id == user_id,
                Task.date == next_date,
                Task.recurrence == task.recurrence,
                Task.completed == False,
                Task.is_deleted == False
            ).first()
            
            if not exists:
                created_task = Task(
                    title=task.title,
                    user_id=user_id,
                    description=task.description,
                    date=next_date,
                    time=task.time,
                    estimated_time=task.estimated_time,
                    priority=task.priority,
                    recurrence=task.recurrence,
                    completed=False,
                    important=task.important,
                    is_deleted=False
                )
                db.session.add(created_task)
                db.session.flush()
                
                # 複製分類關聯
                categories = task.categories.all()
                created_task.categories.extend(categories)
        
        db.session.commit()
        return task, created_task

    @staticmethod
    def toggle_important(user_id, task_id):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task: return None
        task.important = not task.important
        db.session.commit()
        return task

    @staticmethod
    def restore(user_id, task_id):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            return None
        task.is_deleted = False
        db.session.commit()
        return task

    @staticmethod
    def delete(user_id, task_id):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            return None
        task.is_deleted = True
        db.session.commit()
        return task

    @staticmethod
    def purge_all(user_id):
        trash_tasks = Task.query.filter(Task.user_id == user_id, Task.is_deleted == True).all()
        count = len(trash_tasks)
        for task in trash_tasks:
            db.session.delete(task)
        db.session.commit()
        return count
        
    @staticmethod
    def purge_one(user_id, task_id):
        task = Task.query.filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task or not task.is_deleted:
            return 0
        db.session.delete(task)
        db.session.commit()
        return 1
