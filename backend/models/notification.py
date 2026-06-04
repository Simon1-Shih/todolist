from datetime import datetime, timezone

from backend.models import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True, index=True)
    status = db.Column(db.String(20), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    variant = db.Column(db.String(10), nullable=False, default='danger')
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'actorId': self.actor_id,
            'taskId': self.task_id,
            'status': self.status,
            'message': self.message,
            'variant': self.variant,
            'read': self.read,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
