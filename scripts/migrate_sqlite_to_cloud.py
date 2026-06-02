import argparse
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / '.env.vercel.local', override=True)

from backend.migrations import run_startup_migrations
from backend.models import db
from backend.models.category import Category
from backend.models.task import Task
from backend.models.user import User
from backend.wsgi import create_app


def parse_args():
    parser = argparse.ArgumentParser(description='Copy local SQLite FocusFlow data to the cloud database.')
    parser.add_argument('--email', required=True, help='Google account email to own the imported data.')
    parser.add_argument('--name', default='Simon Shih', help='Display name for the target user.')
    parser.add_argument('--picture', default='', help='Optional profile image URL.')
    parser.add_argument('--sqlite-path', default=str(ROOT_DIR / 'backend' / 'instance' / 'focusflow.db'))
    parser.add_argument('--replace', action='store_true', help='Delete this user existing cloud tasks/categories before import.')
    return parser.parse_args()


def read_local_data(sqlite_path):
    connection = sqlite3.connect(sqlite_path)
    connection.row_factory = sqlite3.Row

    tasks = [dict(row) for row in connection.execute('SELECT * FROM tasks ORDER BY id')]
    categories = [dict(row) for row in connection.execute('SELECT * FROM categories ORDER BY id')]
    task_categories = [dict(row) for row in connection.execute('SELECT * FROM task_categories')]

    connection.close()
    return tasks, categories, task_categories


def get_or_create_user(email, name, picture):
    normalized_email = email.strip().lower()
    user = User.query.filter_by(email=normalized_email).first()
    if not user:
        user = User(email=normalized_email)
        db.session.add(user)

    user.name = name or user.name or ''
    user.picture = picture or user.picture or ''
    db.session.commit()
    return user


def clear_user_data(user_id):
    tasks = Task.query.filter(Task.user_id == user_id).all()
    categories = Category.query.filter(Category.user_id == user_id).all()

    for task in tasks:
        task.categories = []
        db.session.delete(task)
    for category in categories:
        db.session.delete(category)
    db.session.commit()


def assign_unowned_cloud_data(user_id):
    Task.query.filter(Task.user_id.is_(None)).update({'user_id': user_id})
    Category.query.filter(Category.user_id.is_(None)).update({'user_id': user_id})
    db.session.commit()


def import_data(user, local_tasks, local_categories, local_task_categories):
    category_id_map = {}
    task_id_map = {}

    for local_category in local_categories:
        category = Category(
            user_id=user.id,
            label=local_category['label'],
            color=local_category['color'],
        )
        db.session.add(category)
        db.session.flush()
        category_id_map[local_category['id']] = category.id

    for local_task in local_tasks:
        task = Task(
            user_id=user.id,
            title=local_task['title'],
            description=local_task['description'] or '',
            date=local_task['date'],
            time=local_task['time'],
            estimated_time=local_task['estimated_time'],
            priority=local_task['priority'],
            completed=bool(local_task['completed']),
            important=bool(local_task['important']),
            is_deleted=bool(local_task['is_deleted']),
            recurrence=local_task['recurrence'] or 'none',
        )
        db.session.add(task)
        db.session.flush()
        task_id_map[local_task['id']] = task.id

    for relation in local_task_categories:
        task_id = task_id_map.get(relation['task_id'])
        category_id = category_id_map.get(relation['category_id'])
        if not task_id or not category_id:
            continue

        task = db.session.get(Task, task_id)
        category = db.session.get(Category, category_id)
        if task and category:
            task.categories.append(category)

    db.session.commit()
    return len(local_tasks), len(local_categories)


def main():
    args = parse_args()
    local_tasks, local_categories, local_task_categories = read_local_data(args.sqlite_path)

    app = create_app('production')
    run_startup_migrations(app)

    with app.app_context():
        user = get_or_create_user(args.email, args.name, args.picture)
        if args.replace:
            clear_user_data(user.id)
        assign_unowned_cloud_data(user.id)
        task_count, category_count = import_data(user, local_tasks, local_categories, local_task_categories)
        print(f'imported tasks={task_count} categories={category_count} user={user.email}')


if __name__ == '__main__':
    main()
