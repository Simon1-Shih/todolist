from backend.models import db
from backend.models.category import Category


class CategoryController:
    @staticmethod
    def get_all(user_id):
        return Category.query.filter(Category.user_id == user_id).all()

    @staticmethod
    def get_by_id(user_id, category_id):
        return Category.query.filter(Category.id == category_id, Category.user_id == user_id).first()

    @staticmethod
    def create(user_id, data):
        category = Category(
            user_id=user_id,
            label=data['label'],
            color=data.get('color', 'bg-blue-500')
        )
        db.session.add(category)
        db.session.commit()
        return category

    @staticmethod
    def update(user_id, category_id, data):
        category = CategoryController.get_by_id(user_id, category_id)
        if not category:
            return None
        category.label = data.get('label', category.label)
        category.color = data.get('color', category.color)
        db.session.commit()
        return category

    @staticmethod
    def delete(user_id, category_id):
        category = CategoryController.get_by_id(user_id, category_id)
        if not category:
            return None
        db.session.delete(category)
        db.session.commit()
        return True
