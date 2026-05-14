from backend.models import db
from backend.models.category import Category


class CategoryController:
    @staticmethod
    def get_all():
        return Category.query.all()

    @staticmethod
    def get_by_id(category_id):
        return Category.query.get(category_id)

    @staticmethod
    def create(data):
        category = Category(
            label=data['label'],
            color=data.get('color', 'bg-blue-500')
        )
        db.session.add(category)
        db.session.commit()
        return category

    @staticmethod
    def update(category_id, data):
        category = Category.query.get(category_id)
        if not category:
            return None
        category.label = data.get('label', category.label)
        category.color = data.get('color', category.color)
        db.session.commit()
        return category

    @staticmethod
    def delete(category_id):
        category = Category.query.get(category_id)
        if not category:
            return None
        db.session.delete(category)
        db.session.commit()
        return True
