from datetime import datetime, timezone

from backend.models import db


class NotificationDismissal(db.Model):
    __tablename__ = 'notification_dismissals'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'task_id', 'status', name='uq_notification_dismissal'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True, index=True)
    status = db.Column(db.String(40), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
