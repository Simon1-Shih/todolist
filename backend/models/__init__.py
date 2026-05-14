from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from backend.models.category import Category
from backend.models.task import Task, task_categories

__all__ = ['db', 'Category', 'Task', 'task_categories']
