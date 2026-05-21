import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.wsgi import create_app
from backend.models import db
from sqlalchemy import text, inspect

def run_migration():
    app = create_app()
    with app.app_context():
        # 檢查欄位是否存在
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('tasks')]
        
        if 'recurrence' not in columns:
            print("Adding 'recurrence' column to 'tasks' table...")
            with db.engine.begin() as conn:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN recurrence VARCHAR(10) DEFAULT 'none'"))
            print("Migration successful! Column 'recurrence' added.")
        else:
            print("Column 'recurrence' already exists in 'tasks' table. No migration needed.")

if __name__ == '__main__':
    run_migration()
