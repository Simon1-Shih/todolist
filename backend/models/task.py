from backend.models import db


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    time = db.Column(db.String(5), default=None)  # HH:MM
    estimated_time = db.Column(db.Integer, default=None)  # minutes
    priority = db.Column(db.String(10), nullable=False, default='Medium')  # High/Medium/Low
    completed = db.Column(db.Boolean, default=False)
    important = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)

    def to_dict(self):
        # categories 由 backref 提供
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date,
            'time': self.time,
            'estimatedTime': str(self.estimated_time) if self.estimated_time else '',
            'categoryIds': [c.id for c in self.categories.all()],
            'priority': self.priority,
            'completed': self.completed,
            'important': self.important,
            'isDeleted': self.is_deleted,
        }


# Many-to-many association table - 必須在 module level 讓 SQLAlchemy 能建立
task_categories = db.Table('task_categories',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True)
)
