from backend.models import db


class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    label = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(50), nullable=False, default='bg-blue-500')

    # 延遲 relationship，避免 circular import
    tasks = db.relationship('Task', secondary='task_categories',
                            backref=db.backref('categories', lazy='dynamic'),
                            lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'label': self.label,
            'color': self.color,
        }
