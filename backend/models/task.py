from backend.models import db


task_categories = db.Table(
    'task_categories',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True),
)


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    date = db.Column(db.String(10), nullable=False)
    time = db.Column(db.String(5), default=None)
    estimated_time = db.Column(db.Integer, default=None)
    priority = db.Column(db.String(10), nullable=False, default='Medium')
    completed = db.Column(db.Boolean, default=False)
    important = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    recurrence = db.Column(db.String(10), nullable=False, default='none')

    def to_dict(self):
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
            'recurrence': self.recurrence,
        }
