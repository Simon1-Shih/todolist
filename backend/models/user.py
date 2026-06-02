from backend.models import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    name = db.Column(db.String(255), default='')
    picture = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'picture': self.picture,
        }
