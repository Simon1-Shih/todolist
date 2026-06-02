from backend.models import db


class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    label = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(50), nullable=False, default='bg-blue-500')

    tasks = db.relationship(
        'Task',
        secondary='task_categories',
        backref=db.backref('categories', lazy='dynamic'),
        lazy='dynamic',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'label': self.label,
            'color': self.color,
        }
