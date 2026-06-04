from sqlalchemy import inspect, text

from backend.models import db


def run_startup_migrations(app):
    with app.app_context():
        inspector = inspect(db.engine)
        table_names = set(inspector.get_table_names())
        dialect = db.engine.dialect.name

        if 'tasks' in table_names:
            task_columns = {column['name'] for column in inspector.get_columns('tasks')}
            if 'user_id' not in task_columns:
                add_user_id_column('tasks', dialect)
                create_user_id_index('tasks', dialect)
            if 'requester_id' not in task_columns:
                add_nullable_integer_column('tasks', 'requester_id', dialect, references='users(id)')
                create_named_index('tasks', 'requester_id', dialect)
            if 'delegated_task_id' not in task_columns:
                add_nullable_integer_column('tasks', 'delegated_task_id', dialect, references='tasks(id)')
                create_named_index('tasks', 'delegated_task_id', dialect)

        if 'categories' in table_names:
            category_columns = {column['name'] for column in inspector.get_columns('categories')}
            if 'user_id' not in category_columns:
                add_user_id_column('categories', dialect)
                create_user_id_index('categories', dialect)

        if 'notifications' not in table_names:
            db.create_all()


def add_user_id_column(table_name, dialect):
    if dialect == 'postgresql':
        statement = f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)'
    else:
        statement = f'ALTER TABLE {table_name} ADD COLUMN user_id INTEGER'

    with db.engine.begin() as connection:
        connection.execute(text(statement))


def create_user_id_index(table_name, dialect):
    index_name = f'ix_{table_name}_user_id'
    if dialect == 'postgresql':
        statement = f'CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} (user_id)'
    else:
        statement = f'CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} (user_id)'

    with db.engine.begin() as connection:
        connection.execute(text(statement))


def add_nullable_integer_column(table_name, column_name, dialect, references=None):
    reference_sql = f' REFERENCES {references}' if references and dialect == 'postgresql' else ''
    if dialect == 'postgresql':
        statement = f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} INTEGER{reference_sql}'
    else:
        statement = f'ALTER TABLE {table_name} ADD COLUMN {column_name} INTEGER'

    with db.engine.begin() as connection:
        connection.execute(text(statement))


def create_named_index(table_name, column_name, dialect):
    index_name = f'ix_{table_name}_{column_name}'
    statement = f'CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({column_name})'

    with db.engine.begin() as connection:
        connection.execute(text(statement))
