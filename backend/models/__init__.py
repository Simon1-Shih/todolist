from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from backend.models.category import Category
from backend.models.task import Task, task_categories
from backend.models.user import User
from backend.models.notification import Notification

__all__ = ['db', 'Category', 'Task', 'User', 'Notification', 'task_categories']
