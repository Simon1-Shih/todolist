from datetime import date

from sqlalchemy import case

from backend.models import db
from backend.models.category import Category
from backend.models.notification import Notification
from backend.models.task import Task
from backend.models.user import User


class TaskController:
    REQUESTER_CATEGORY_COLORS = [
        'bg-emerald-500',
        'bg-indigo-500',
        'bg-pink-500',
        'bg-teal-500',
        'bg-orange-500',
        'bg-purple-500',
        'bg-cyan-500',
    ]
    EDITABLE_FIELDS = ('title', 'description', 'date', 'time', 'priority', 'recurrence')

    @staticmethod
    def _get_categories_for_task(task):
        return [cat.id for cat in task.categories.all()]

    @staticmethod
    def _display_name(user):
        if not user:
            return 'user'
        return user.name or user.email

    @staticmethod
    def _ensure_requester_category(assignee_id, requester):
        label = TaskController._display_name(requester)
        category = Category.query.filter(Category.user_id == assignee_id, Category.label == label).first()
        if category:
            return category

        count = Category.query.filter(Category.user_id == assignee_id).count()
        category = Category(
            user_id=assignee_id,
            label=label,
            color=TaskController.REQUESTER_CATEGORY_COLORS[count % len(TaskController.REQUESTER_CATEGORY_COLORS)],
        )
        db.session.add(category)
        db.session.flush()
        return category

    @staticmethod
    def _notification_status_label(status):
        return {
            'completed': '完成',
            'deleted': '刪除',
            'purged': '完全刪除',
            'overdue': '逾期',
        }.get(status, status)

    @staticmethod
    def _add_notification(recipient_id, actor_id, task, status, message, variant):
        if not recipient_id or recipient_id == actor_id:
            return

        exists = Notification.query.filter(
            Notification.user_id == recipient_id,
            Notification.task_id == task.id,
            Notification.status == status,
        ).first()
        if exists:
            return

        db.session.add(Notification(
            user_id=recipient_id,
            actor_id=actor_id,
            task_id=task.id,
            status=status,
            message=message,
            variant=variant,
        ))

    @staticmethod
    def _notify_requester(task, status):
        if not task.requester_id or task.requester_id == task.user_id:
            return

        assignee = task.assignee or User.query.get(task.user_id)
        assignee_name = TaskController._display_name(assignee)
        status_label = TaskController._notification_status_label(status)
        TaskController._add_notification(
            recipient_id=task.requester_id,
            actor_id=task.user_id,
            task=task,
            status=status,
            message=f'委託{assignee_name}的{task.date} {task.title}已被標記{status_label}',
            variant='success' if status == 'completed' else 'danger',
        )

    @staticmethod
    def _notify_assignee(task, status):
        if not task.requester_id or task.requester_id == task.user_id:
            return

        requester = task.requester or User.query.get(task.requester_id)
        requester_name = TaskController._display_name(requester)
        status_label = TaskController._notification_status_label(status)
        TaskController._add_notification(
            recipient_id=task.user_id,
            actor_id=task.requester_id,
            task=task,
            status=f'requester_{status}',
            message=f'{requester_name}委託你的{task.date} {task.title}已被標記{status_label}',
            variant='success' if status == 'completed' else 'danger',
        )

    @staticmethod
    def _find_mirror_task(delegated_task_id, requester_id=None):
        query = Task.query.filter(Task.delegated_task_id == delegated_task_id)
        if requester_id:
            query = query.filter(Task.user_id == requester_id)
        return query.first()

    @staticmethod
    def _resolve_user_action(user_id, task_id):
        task = Task.query.get(task_id)
        if not task:
            return None

        if task.delegated_task_id and task.user_id == user_id:
            delegated = Task.query.get(task.delegated_task_id)
            if delegated and delegated.requester_id == user_id:
                return {
                    'actor': 'requester',
                    'task': task,
                    'target': delegated,
                    'mirror': task,
                    'return_task': task,
                }

        if task.requester_id == user_id:
            mirror = TaskController._find_mirror_task(task.id, user_id)
            return {
                'actor': 'requester',
                'task': task,
                'target': task,
                'mirror': mirror,
                'return_task': task,
            }

        if task.user_id == user_id:
            return {
                'actor': 'assignee' if task.requester_id else 'owner',
                'task': task,
                'target': task,
                'mirror': TaskController._find_mirror_task(task.id, task.requester_id) if task.requester_id else None,
                'return_task': task,
            }

        return None

    @staticmethod
    def _attach_delegated_details(task_dict, task):
        if not task.delegated_task_id:
            return task_dict

        delegated = Task.query.get(task.delegated_task_id)
        if not delegated:
            return task_dict

        task_dict['delegatedAssigneeId'] = delegated.user_id
        task_dict['delegatedAssignee'] = delegated.assignee.to_dict() if delegated.assignee else None
        return task_dict

    @staticmethod
    def _to_dict_with_categories(task):
        data = task.to_dict()
        data['categoryIds'] = TaskController._get_categories_for_task(task)
        return TaskController._attach_delegated_details(data, task)

    @staticmethod
    def _sync_delegated_pair(target, mirror):
        if not mirror:
            return

        mirror.title = target.title
        mirror.description = target.description
        mirror.date = target.date
        mirror.time = target.time
        mirror.estimated_time = target.estimated_time
        mirror.priority = target.priority
        mirror.completed = target.completed
        mirror.important = target.important
        mirror.is_deleted = target.is_deleted
        mirror.recurrence = 'none'

    @staticmethod
    def _apply_task_data(task, data):
        for field in TaskController.EDITABLE_FIELDS:
            if field in data:
                setattr(task, field, data.get(field) or ('' if field in ('description', 'time') else getattr(task, field)))

        if 'estimatedTime' in data:
            task.estimated_time = int(data['estimatedTime']) if data.get('estimatedTime') else None

    @staticmethod
    def _validate_request_hours(requester_id, assignee_id, due_date, estimated_time, exclude_task_id=None):
        if not estimated_time:
            return False, 'Estimated time is required for delegated tasks'

        availability = TaskController.get_availability(
            requester_id,
            assignee_id,
            due_date,
            exclude_task_id=exclude_task_id,
        )
        requested_hours = int(estimated_time or 0) / 60
        if availability['dayHours'] + requested_hours > 8:
            return False, 'Assignee is over the 8 hour daily limit'

        return True, None

    @staticmethod
    def create_overdue_notifications(user_id):
        today = date.today().isoformat()
        overdue_tasks = Task.query.filter(
            Task.requester_id == user_id,
            Task.date < today,
            Task.completed == False,
            Task.is_deleted == False,
        ).all()
        for task in overdue_tasks:
            TaskController._notify_requester(task, 'overdue')
        db.session.commit()

    @staticmethod
    def get_all(user_id, filter_type='all', search='', sort_by='date', sort_order='asc'):
        tasks = Task.query.filter(Task.user_id == user_id)

        if filter_type == 'trash':
            tasks = tasks.filter(Task.is_deleted == True)
        elif filter_type != 'full':
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
                *((Task.priority == k, v) for k, v in priority_order.items()),
                else_=4,
            )
            tasks = tasks.order_by(priority_case if sort_order == 'asc' else priority_case.desc())
        elif sort_by == 'time':
            tasks = tasks.order_by(Task.time if sort_order == 'asc' else Task.time.desc())
        else:
            tasks = tasks.order_by(Task.date if sort_order == 'asc' else Task.date.desc())

        return [TaskController._to_dict_with_categories(task) for task in tasks.all()]

    @staticmethod
    def get_by_id(user_id, task_id):
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return None
        return TaskController._to_dict_with_categories(action['return_task'])

    @staticmethod
    def create(user_id, data):
        assignee_id = int(data.get('assigneeId') or user_id)
        if assignee_id != user_id and not User.query.get(assignee_id):
            return None, None

        requester = User.query.get(user_id)
        delegated_task = Task(
            user_id=assignee_id,
            requester_id=user_id if assignee_id != user_id else None,
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data.get('time'),
            estimated_time=int(data['estimatedTime']) if data.get('estimatedTime') else None,
            priority=data.get('priority', 'Medium'),
            completed=False,
            important=False,
            is_deleted=False,
            recurrence=data.get('recurrence', 'none'),
        )
        db.session.add(delegated_task)
        db.session.flush()

        category_ids = data.get('categoryIds', [])
        mirror_task = None
        if assignee_id != user_id and requester:
            delegated_task.categories.append(TaskController._ensure_requester_category(assignee_id, requester))
            mirror_task = Task(
                user_id=user_id,
                requester_id=None,
                delegated_task_id=delegated_task.id,
                title=data['title'],
                description=data.get('description', ''),
                date=data['date'],
                time=data.get('time'),
                estimated_time=int(data['estimatedTime']) if data.get('estimatedTime') else None,
                priority=data.get('priority', 'Medium'),
                completed=False,
                important=False,
                is_deleted=False,
                recurrence='none',
            )
            db.session.add(mirror_task)
        elif isinstance(category_ids, list) and category_ids:
            categories = Category.query.filter(Category.id.in_(category_ids), Category.user_id == assignee_id).all()
            delegated_task.categories.extend(categories)

        db.session.commit()
        return (mirror_task if mirror_task else delegated_task), None

    @staticmethod
    def update(user_id, task_id, data):
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return None, 'Task not found'

        target = action['target']
        mirror = action['mirror']
        actor = action['actor']

        is_request_edit = actor == 'requester' and bool(target.requester_id)
        if is_request_edit:
            next_date = data.get('date') or target.date
            next_estimated_time = data.get('estimatedTime') if 'estimatedTime' in data else target.estimated_time
            ok, error = TaskController._validate_request_hours(
                requester_id=user_id,
                assignee_id=target.user_id,
                due_date=next_date,
                estimated_time=next_estimated_time,
                exclude_task_id=target.id,
            )
            if not ok:
                return None, error

        TaskController._apply_task_data(target, data)

        if actor == 'owner':
            category_ids = data.get('categoryIds', [])
            if isinstance(category_ids, list):
                target.categories = Category.query.filter(Category.id.in_(category_ids), Category.user_id == user_id).all()
        elif actor == 'assignee':
            category_ids = data.get('categoryIds', [])
            if isinstance(category_ids, list):
                target.categories = Category.query.filter(Category.id.in_(category_ids), Category.user_id == user_id).all()
            TaskController._sync_delegated_pair(target, mirror)
        elif actor == 'requester':
            TaskController._sync_delegated_pair(target, mirror)

        db.session.commit()
        return action['return_task'], None

    @staticmethod
    def _calculate_next_recurrence_date(current_date_str, recurrence):
        import calendar
        import datetime

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
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return None

        target = action['target']
        mirror = action['mirror']
        actor = action['actor']
        was_completed = target.completed
        target.completed = not target.completed
        TaskController._sync_delegated_pair(target, mirror)

        if not was_completed and target.completed:
            if actor == 'requester':
                TaskController._notify_assignee(target, 'completed')
            else:
                TaskController._notify_requester(target, 'completed')

        created_task = None
        if actor in ('owner', 'assignee') and not was_completed and target.completed and target.recurrence != 'none':
            next_date = TaskController._calculate_next_recurrence_date(target.date, target.recurrence)
            exists = Task.query.filter(
                Task.title == target.title,
                Task.user_id == user_id,
                Task.date == next_date,
                Task.recurrence == target.recurrence,
                Task.completed == False,
                Task.is_deleted == False,
            ).first()

            if not exists:
                created_task = Task(
                    title=target.title,
                    user_id=user_id,
                    requester_id=target.requester_id,
                    description=target.description,
                    date=next_date,
                    time=target.time,
                    estimated_time=target.estimated_time,
                    priority=target.priority,
                    recurrence=target.recurrence,
                    completed=False,
                    important=target.important,
                    is_deleted=False,
                )
                db.session.add(created_task)
                db.session.flush()
                created_task.categories.extend(target.categories.all())

        db.session.commit()
        return action['return_task'], created_task

    @staticmethod
    def toggle_important(user_id, task_id):
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return None

        task = action['target']
        task.important = not task.important
        TaskController._sync_delegated_pair(task, action['mirror'])
        db.session.commit()
        return action['return_task']

    @staticmethod
    def restore(user_id, task_id):
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return None

        task = action['target']
        task.is_deleted = False
        TaskController._sync_delegated_pair(task, action['mirror'])
        db.session.commit()
        return action['return_task']

    @staticmethod
    def delete(user_id, task_id):
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return None

        task = action['target']
        task.is_deleted = True
        TaskController._sync_delegated_pair(task, action['mirror'])
        if action['actor'] == 'requester':
            TaskController._notify_assignee(task, 'deleted')
        db.session.commit()
        return action['return_task']

    @staticmethod
    def purge_all(user_id):
        trash_tasks = Task.query.filter(Task.user_id == user_id, Task.is_deleted == True).all()
        count = 0
        purged_ids = set()

        for task in trash_tasks:
            if task.id in purged_ids:
                continue
            action = TaskController._resolve_user_action(user_id, task.id)
            if not action:
                continue
            target = action['target']
            mirror = action['mirror']
            if action['actor'] == 'requester':
                TaskController._notify_assignee(target, 'purged')
            else:
                TaskController._notify_requester(target, 'purged')
            for item in (mirror, target):
                if item and item.id not in purged_ids:
                    purged_ids.add(item.id)
                    db.session.delete(item)
                    count += 1

        db.session.commit()
        return count

    @staticmethod
    def purge_one(user_id, task_id):
        action = TaskController._resolve_user_action(user_id, task_id)
        if not action:
            return 0

        target = action['target']
        mirror = action['mirror']
        if not action['return_task'].is_deleted and not target.is_deleted:
            return 0

        if action['actor'] == 'requester':
            TaskController._notify_assignee(target, 'purged')
        else:
            TaskController._notify_requester(target, 'purged')

        deleted = 0
        seen = set()
        for item in (mirror, target):
            if item and item.id not in seen:
                seen.add(item.id)
                db.session.delete(item)
                deleted += 1

        db.session.commit()
        return 1 if deleted else 0

    @staticmethod
    def get_availability(requester_id, assignee_id, due_date, exclude_task_id=None):
        tasks = Task.query.filter(
            Task.user_id == assignee_id,
            Task.date <= due_date,
            Task.completed == False,
            Task.is_deleted == False,
        ).all()
        if exclude_task_id:
            tasks = [task for task in tasks if task.id != exclude_task_id]
        day_tasks = [task for task in tasks if task.date == due_date]

        return {
            'regularWork': sum(1 for task in tasks if not task.requester_id),
            'otherRequests': sum(1 for task in tasks if task.requester_id and task.requester_id != requester_id),
            'yourRequests': sum(1 for task in tasks if task.requester_id == requester_id),
            'dayHours': round(sum((task.estimated_time or 0) for task in day_tasks) / 60, 2),
        }
