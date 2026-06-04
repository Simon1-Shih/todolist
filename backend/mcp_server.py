"""
FocusFlow MCP Server
====================
Exposes FocusFlow task/category management as MCP tools via fastmcp.
Run: python backend/mcp_server.py
"""
import functools
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, List, Optional, Any

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.wsgi import create_app
from backend.controllers.task_controller import TaskController
from backend.controllers.category_controller import CategoryController
from backend.models.user import User

# Flask app singleton
_flask_app = create_app()


class AppContext:
    """Holds the Flask application context for the MCP lifespan."""
    def __init__(self, app):
        self.app = app
        self.ctx = None

    def push(self):
        self.ctx = self.app.app_context()
        self.ctx.push()

    def pop(self):
        if self.ctx:
            self.ctx.pop()
            self.ctx = None


@asynccontextmanager
async def app_lifespan(server) -> AsyncIterator[AppContext]:
    """Maintain a single Flask app context across the MCP session."""
    context = AppContext(_flask_app)
    context.push()
    try:
        yield context
    finally:
        context.pop()


from fastmcp import FastMCP

mcp = FastMCP(
    "focusflow",
    version="1.0.0",
    lifespan=app_lifespan,
    instructions=(
        "FocusFlow Task Manager MCP Server.\n"
        "Provides full CRUD for tasks and categories, plus filtering, searching, "
        "and status toggling (complete / important / trash / restore).\n"
        "Date format: YYYY-MM-DD. Time format: HH:MM. Priority: High/Medium/Low."
    ),
)


# ---------------------------------------------------------------------------
# Flask app-context wrapper for sync tools
# ---------------------------------------------------------------------------
def _with_app_ctx(fn):
    """Decorator that wraps a sync function inside the Flask app context."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        with _flask_app.app_context():
            return fn(*args, **kwargs)
    return wrapper


def _task_to_dict(task) -> Dict[str, Any]:
    """Normalise a task dict (handles both ORM instance and plain dict)."""
    if hasattr(task, "to_dict"):
        return task.to_dict()
    return dict(task)


def _default_user_id() -> Optional[int]:
    user = User.query.order_by(User.id.asc()).first()
    return user.id if user else None


def _cat_to_dict(cat) -> Dict[str, Any]:
    if hasattr(cat, "to_dict"):
        return cat.to_dict()
    return dict(cat)


# ---------------------------------------------------------------------------
# Task Tools
# ---------------------------------------------------------------------------
@mcp.tool(name="list_tasks")
@_with_app_ctx
def list_tasks(
    filter_type: str = "all",
    search: str = "",
    sort_by: str = "date",
    sort_order: str = "asc",
) -> Dict[str, Any]:
    """List tasks with optional filter, search, and sorting.

    Args:
        filter_type: all | today | important | completed | trash | full
        search: substring to match against task titles
        sort_by: date | time | priority
        sort_order: asc | desc
    """
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    tasks = TaskController.get_all(
        user_id=user_id,
        filter_type=filter_type,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return {"success": True, "count": len(tasks), "tasks": tasks}


@mcp.tool(name="get_task")
@_with_app_ctx
def get_task(task_id: int) -> Dict[str, Any]:
    """Get a single task by ID."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    task = TaskController.get_by_id(user_id, task_id)
    if not task:
        return {"success": False, "error": "Task not found"}
    return {"success": True, "task": task}


@mcp.tool(name="create_task")
@_with_app_ctx
def create_task(
    title: str,
    date: str,
    description: str = "",
    time: Optional[str] = None,
    estimated_time: Optional[int] = None,
    priority: str = "Medium",
    category_ids: Optional[List[int]] = None,
    recurrence: str = "none",
) -> Dict[str, Any]:
    """Create a new task.

    Args:
        title: task title (required)
        date: due date YYYY-MM-DD (required)
        description: optional details
        time: optional HH:MM
        estimated_time: optional minutes
        priority: High | Medium | Low
        category_ids: list of category IDs to assign
        recurrence: none | daily | weekly | monthly
    """
    data = {
        "title": title,
        "description": description,
        "date": date,
        "time": time,
        "estimatedTime": estimated_time,
        "priority": priority,
        "categoryIds": category_ids or [],
        "recurrence": recurrence,
    }
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    task, error = TaskController.create(user_id, data)
    if error:
        return {"success": False, "error": error}
    return {"success": True, "task": _task_to_dict(task)}


@mcp.tool(name="update_task")
@_with_app_ctx
def update_task(
    task_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    date: Optional[str] = None,
    time: Optional[str] = None,
    estimated_time: Optional[int] = None,
    priority: Optional[str] = None,
    category_ids: Optional[List[int]] = None,
    recurrence: Optional[str] = None,
) -> Dict[str, Any]:
    """Update an existing task. Only provided fields are changed."""
    data: Dict[str, Any] = {}
    if title is not None:
        data["title"] = title
    if description is not None:
        data["description"] = description
    if date is not None:
        data["date"] = date
    if time is not None:
        data["time"] = time
    if estimated_time is not None:
        data["estimatedTime"] = estimated_time
    if priority is not None:
        data["priority"] = priority
    if category_ids is not None:
        data["categoryIds"] = category_ids
    if recurrence is not None:
        data["recurrence"] = recurrence

    if not data:
        return {"success": False, "error": "No fields provided for update"}

    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    task, error = TaskController.update(user_id, task_id, data)
    if error and error != "Task not found":
        return {"success": False, "error": error}
    if not task:
        return {"success": False, "error": "Task not found"}
    return {"success": True, "task": _task_to_dict(task)}


@mcp.tool(name="toggle_task_complete")
@_with_app_ctx
def toggle_task_complete(task_id: int) -> Dict[str, Any]:
    """Toggle the completion status of a task."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    res = TaskController.toggle_complete(user_id, task_id)
    if not res:
        return {"success": False, "error": "Task not found"}
    task, created_task = res
    response = {"success": True, "task": _task_to_dict(task)}
    if created_task:
        response["created_task"] = _task_to_dict(created_task)
    return response


@mcp.tool(name="toggle_task_important")
@_with_app_ctx
def toggle_task_important(task_id: int) -> Dict[str, Any]:
    """Toggle the important (starred) status of a task."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    task = TaskController.toggle_important(user_id, task_id)
    if not task:
        return {"success": False, "error": "Task not found"}
    return {"success": True, "task": _task_to_dict(task)}


@mcp.tool(name="delete_task")
@_with_app_ctx
def delete_task(task_id: int) -> Dict[str, Any]:
    """Soft-delete a task (move to trash)."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    task = TaskController.delete(user_id, task_id)
    if not task:
        return {"success": False, "error": "Task not found"}
    return {"success": True, "task": _task_to_dict(task), "message": "Task moved to trash"}


@mcp.tool(name="restore_task")
@_with_app_ctx
def restore_task(task_id: int) -> Dict[str, Any]:
    """Restore a task from trash."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    task = TaskController.restore(user_id, task_id)
    if not task:
        return {"success": False, "error": "Task not found"}
    return {"success": True, "task": _task_to_dict(task), "message": "Task restored from trash"}


@mcp.tool(name="purge_task")
@_with_app_ctx
def purge_task(task_id: int) -> Dict[str, Any]:
    """Permanently delete a single task that is already in trash."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    count = TaskController.purge_one(user_id, task_id)
    if count == 0:
        return {"success": False, "error": "Task not found or not in trash"}
    return {"success": True, "message": f"Task {task_id} permanently deleted"}


@mcp.tool(name="purge_all_trash")
@_with_app_ctx
def purge_all_trash() -> Dict[str, Any]:
    """Permanently delete all tasks in trash."""
    user_id = _default_user_id()
    if not user_id:
        return {"success": False, "error": "No user found"}
    count = TaskController.purge_all(user_id)
    return {"success": True, "purged": count, "message": f"{count} tasks permanently deleted"}


# ---------------------------------------------------------------------------
# Category Tools
# ---------------------------------------------------------------------------
@mcp.tool(name="list_categories")
@_with_app_ctx
def list_categories() -> Dict[str, Any]:
    """List all categories."""
    cats = CategoryController.get_all()
    return {"success": True, "count": len(cats), "categories": [_cat_to_dict(c) for c in cats]}


@mcp.tool(name="get_category")
@_with_app_ctx
def get_category(category_id: int) -> Dict[str, Any]:
    """Get a single category by ID."""
    cat = CategoryController.get_by_id(category_id)
    if not cat:
        return {"success": False, "error": "Category not found"}
    return {"success": True, "category": _cat_to_dict(cat)}


@mcp.tool(name="create_category")
@_with_app_ctx
def create_category(label: str, color: str = "bg-blue-500") -> Dict[str, Any]:
    """Create a new category.

    Args:
        label: display name (required)
        color: Tailwind color class, e.g. bg-red-500, bg-green-500
    """
    cat = CategoryController.create({"label": label, "color": color})
    return {"success": True, "category": _cat_to_dict(cat)}


@mcp.tool(name="update_category")
@_with_app_ctx
def update_category(
    category_id: int,
    label: Optional[str] = None,
    color: Optional[str] = None,
) -> Dict[str, Any]:
    """Update an existing category."""
    data: Dict[str, Any] = {}
    if label is not None:
        data["label"] = label
    if color is not None:
        data["color"] = color
    if not data:
        return {"success": False, "error": "No fields provided for update"}

    cat = CategoryController.update(category_id, data)
    if not cat:
        return {"success": False, "error": "Category not found"}
    return {"success": True, "category": _cat_to_dict(cat)}


@mcp.tool(name="delete_category")
@_with_app_ctx
def delete_category(category_id: int) -> Dict[str, Any]:
    """Delete a category permanently."""
    success = CategoryController.delete(category_id)
    if not success:
        return {"success": False, "error": "Category not found"}
    return {"success": True, "message": "Category deleted successfully"}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    mcp.run()
