# Software Design Document (SDD) - FocusFlow

## 1. Introduction

FocusFlow is a modern single-page application (SPA) for efficiently managing tasks, schedules, and categories. The application allows users to sort tasks by time and priority, manage categories natively through simple directory-like interactions, and schedule tasks dynamically via an interactive calendar.

## 2. Architecture Overview

FocusFlow is a **full-stack application** with a React frontend and Flask backend communicating via RESTful JSON APIs.

### Frontend
**Framework:** React 18.x with TypeScript
**Build Tool:** Vite
**Styling:** Tailwind CSS v4 (Utility-first CSS)
**Icons:** `lucide-react`
**Animation:** `motion/react` (Framer Motion)
**State Management:** React Hooks (`useState`, `useMemo`) — local component state lifted to `App.tsx`. Frontend state is synced with backend via API calls.

### Backend
**Framework:** Flask (Python 3.x)
**Database:** SQLite via SQLAlchemy ORM
**CORS:** `flask-cors` for frontend-backend cross-origin communication
**Architecture:** Flask MVC — Models (data layer), Controllers (business logic), Views (API routes)

### MCP Server
**Framework:** `fastmcp`
**Purpose:** Exposes FocusFlow task/category management as MCP tools for AI agents (e.g., Hermes Agent) to call
**Startup:** `python backend/mcp_server.py` (or auto-started via Hermes Agent `mcp_servers` config)
**Available Tools:** `list_tasks`, `get_task`, `create_task`, `update_task`, `toggle_task_complete`, `toggle_task_important`, `delete_task`, `restore_task`, `purge_task`, `purge_all_trash`, `list_categories`, `get_category`, `create_category`, `update_category`, `delete_category`

## 3. Directory Structure

```
/mnt/e/focusflow/                # Project root (WSL path)
├── CLAUDE.md                    # Claude Code development guide
├── SDD.md / SDD_CN.md           # Software Design Document (EN/CN)
├── README.md                    # Project readme
├── settings.local.json          # Local settings
│
├── backend/                     # Backend source (Flask MVC)
│   ├── wsgi.py                  # Flask app entry and initialization
│   ├── config.py                # Config (DB, CORS, etc.)
│   ├── mcp_server.py            # MCP Server (fastmcp framework)
│   ├── requirements.txt         # Python dependencies
│   ├── models/                  # Data models (SQLAlchemy ORM)
│   │   ├── __init__.py           # Database and model exports
│   │   ├── task.py              # Task model
│   │   └── category.py          # Category model
│   ├── controllers/             # Business logic layer
│   │   ├── __init__.py
│   │   ├── task_controller.py   # Task business logic
│   │   └── category_controller.py # Category business logic
│   └── views/                   # API route layer
│       ├── __init__.py
│       ├── task_views.py        # Task API routes
│       └── category_views.py    # Category API routes
│
├── frontend/                    # Frontend source (React SPA)
│   ├── package.json             # npm dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── index.html               # HTML entry
│   ├── dist/                    # Production build output
│   └── src/                     # Source code
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Main coordinator and state orchestrator
│       ├── index.css            # Global CSS and Tailwind entry
│       ├── api.ts               # API call wrapper
│       ├── components/          # Reusable/UI components
│       │   ├── AddTaskModal.tsx # Modal form for creating/editing tasks
│       │   ├── Header.tsx       # Top navbar (search, view toggle, profile, bell, settings)
│       │   └── Sidebar.tsx       # Left sidebar (categories, filters, trash)
│       └── views/               # Main route/screen views
│           ├── Dashboard.tsx    # Task list view with search and metrics widgets
│           └── CalendarView.tsx # Visual calendar rendering task dots/strips
│
└── instance/
    └── focusflow.db             # SQLite database file
```

## 4. State Management

FocusFlow uses a **dual-layer state architecture**: local frontend state for UI responsiveness, and backend persistent state for data durability.

### Frontend State (React)

Most application core state resides in `App.tsx` to maintain a single source of truth, synced with the backend via API:
* **`tasks: Task[]`** - Core state array holding all tasks. Tasks support multiple categories via `categoryIds: number[]` and soft deletion via `isDeleted?: boolean`.
* **`categories: Category[]`** - Core category list mapping user-defined folders.
* **`currentFilter: string`** - Tracks navigation state between predefined filters (`'all' | 'today' | 'important' | 'completed' | 'trash'`) or dynamic (`'category-{id}'`).
* **`searchQuery: string`** - Bound to `Dashboard`, supports keyword search and date range filtering via computed `useMemo`.
* **`viewMode: 'list' | 'calendar'`** - Current view mode.
* **`calendarSelectedDate: Date | null`** - Selected date on calendar; clicking sets "today" filter and pre-fills the date for new tasks.

### Backend State (Flask + SQLAlchemy + SQLite)
* **`Task` model** — mapped to database `tasks` table, stores all task fields and associations.
* **`Category` model** — mapped to database `categories` table, stores category info and many-to-many associations.
* **`task_categories`** — many-to-many association table between tasks and categories.

### Sorting Priority Implementation

`useMemo` in `App.tsx` (`sortedTasks`) ensures `tasks` are continuously filtered and sorted:
1. **Date (Ascending):** Groups tasks by the same date.
2. **Time (Ascending):** Resolves relative order of tasks on the same day (`undefined` treated as `00:00`).
3. **Priority (Descending):** Falls back to priority order (`High` → `Medium` → `Low`) for same time slot or undefined time.

### Frontend-Backend Data Sync

The frontend makes API calls to the Flask backend via `fetch()`. Every mutation (create, update, delete) in the frontend triggers a corresponding API call. Backend response (or error) determines whether frontend state is updated or rolled back.

### Frontend Local Cache & Optimistic UI Updates

The frontend optimistically updates local state before sending API requests. On failure, local state is rolled back to maintain responsiveness.

## 5. Component Details

### `App.tsx` (Controller)

Defines TypeScript interfaces `Category` and `Task`. Coordinates callbacks (`handleSaveTask`, `handleToggleComplete`, `handleDeleteCategory`, etc.) passed down to functional presentation components. Manages global UI constraints (e.g., `select-none` to globally disable user text selection). Includes visual scrollbar disabling logic in `index.css`. All state mutations trigger corresponding backend API calls.

### `Sidebar.tsx` (Navigation & Category Management)

Features context menus (`onContextMenu`) for deleting/renaming categories, creating new categories via empty-space right-click, and a Trash folder with "Empty Trash" functionality. Predefined task filters include 'All Tasks', 'Today', 'Important', 'Completed', and 'Trash'. Category operations (`onAddCategory`, `onRenameCategory`, `onDeleteCategory`) are synced to the backend.

### `Header.tsx` (Global Utilities)

Contains view toggle buttons (List / Calendar), search bar (supports keyword and date range filtering), bell notification icon, profile avatar, and settings button. The "Add Task" button is located prominently within each view.

### `Dashboard.tsx` (Task List View)

Renders the standard list variant. Task iteration checks completion status, priority, multi-select categories (`categoryIds`), due time (`time`), estimated time (`estimatedTime`), and optional `description`. Dynamically tracks counts:
* Active categories count
* Total tasks count
* Completed tasks count

Includes an inline search bar for task title and date range filtering. Hosts the primary "Add Task" button in the view header. Uses `motion/react` to fluidly expand/collapse task `description` on hover only. Completed tasks are hidden by default in views other than "Completed" and "All Tasks".

### `CalendarView.tsx` (Calendar View)

Uses a generative grid computing local `Date` contexts to draw up to 6 rows. Double-clicking any cell triggers `onAddTask` with the date pre-populated. Hosts the primary "Add Task" button in the calendar header. Calendar data is fetched from the backend API grouped by date.

## 6. Backend API Design (Flask RESTful)

### Task API (`/api/tasks`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | Get all tasks (supports query params: `filter`, `sort_by`, `sort_order`, `search`) |
| GET | `/api/tasks/<id>` | Get a single task by ID |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/<id>` | Update a task |
| PATCH | `/api/tasks/<id>/toggle-complete` | Toggle task completion status |
| PATCH | `/api/tasks/<id>/toggle-important` | Toggle task importance flag |
| DELETE | `/api/tasks/<id>` | Soft delete task (move to trash) |
| DELETE | `/api/tasks/purge` | Permanently delete all tasks in trash |

### Category API (`/api/categories`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Create a new category |
| PUT | `/api/categories/<id>` | Update a category (rename/change color) |
| DELETE | `/api/categories/<id>` | Delete a category |

### Query Parameters (Task List)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `filter` | string | `all` | `all`, `today`, `important`, `completed`, `trash`, `category-{id}` |
| `sort_by` | string | `date` | `date`, `time`, `priority` |
| `sort_order` | string | `asc` | `asc`, `desc` |
| `search` | string | `""` | Keyword search for task titles |

### Response Format

All API responses follow a consistent JSON structure (success):

```json
{
  "success": true,
  "tasks": [...],
  "count": N
}
```

Or for single resource:

```json
{
  "success": true,
  "task": {...}
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description"
}
```

## 7. Data Model

### Task Model

```python
class Task(db.Model):
    id: int           # Primary key, auto-increment
    title: str        # Task title (required)
    description: str  # Task description (optional, default: "")
    date: date        # Due date (YYYY-MM-DD)
    time: time        # Due time (HH:MM, optional)
    estimated_time: int | None  # Estimated duration in minutes (optional)
    priority: str     # Priority level: 'High' | 'Medium' | 'Low' (default: 'Medium')
    completed: bool   # Whether task is completed (default: False)
    important: bool   # Whether task is marked important (default: False)
    is_deleted: bool  # Soft-delete flag (default: False)
    categories: list[Category]  # Many-to-many relationship
```

### Category Model

```python
class Category(db.Model):
    id: int           # Primary key, auto-increment
    label: str        # Category label name
    color: str        # CSS color class (e.g., 'bg-red-500')
```

### Many-to-Many Association Table

```python
task_categories = db.Table('task_categories',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True)
)
```

## 8. Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
python wsgi.py          # Start Flask dev server (default: 5000)

# or using venv
./.venv/Scripts/python.exe wsgi.py

# Frontend
cd frontend
npm run dev            # Start Vite dev server (default: 3000)
npm run build          # Production build
npm run preview        # Preview production build
npm run lint           # TypeScript type-check
```

## 9. Technology Stack Overview

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18.x + TypeScript |
| Backend Framework | Flask (Python 3.x) |
| Database | SQLite (SQLAlchemy ORM) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion (`motion/react`) |
| Icons | lucide-react |
| Build Tool | Vite |
| Frontend Dependencies | npm |
| Backend Dependencies | pip / requirements.txt |
| CORS | flask-cors (frontend-backend cross-origin) |
| MCP Server | fastmcp (Task/Category CRUD tools) |

## 10. Unimplemented Extensibility Targets (UI vs. Logic)

The following UI features exist in styles/designs but lack full JavaScript backend implementation:

| Feature | Component | Current Status |
|---------|-----------|---------------|
| **User Profile** | Header | Static image; no modal auth logic |
| **Notifications** | Header / Bell icon | Static hover icon; no notification center |
| **Settings** | Header / Sidebar | Settings/menu unmapped |
| **Daily Focus Score** | Dashboard metrics | `84 (+12%)` is a placeholder; needs metric derivation logic |
| **Archive** | Sidebar | "Archive" button exists but Tasks have no `archived: boolean` attribute |

## 11. MCP Server Tool List

The MCP Server (`backend/mcp_server.py`) exposes the following tools via the `fastmcp` framework:

### Task Tools

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `list_tasks` | List tasks with filter, search, and sorting | `filter_type`, `search`, `sort_by`, `sort_order` |
| `get_task` | Get a single task by ID | `task_id` |
| `create_task` | Create a new task | `title`, `date`, `description?`, `time?`, `estimated_time?`, `priority?`, `category_ids?` |
| `update_task` | Update a task (only changed fields applied) | `task_id`, `title?`, `description?`, `date?`, `time?`, `estimated_time?`, `priority?`, `category_ids?` |
| `toggle_task_complete` | Toggle completion status | `task_id` |
| `toggle_task_important` | Toggle importance status | `task_id` |
| `delete_task` | Soft delete (move to trash) | `task_id` |
| `restore_task` | Restore from trash | `task_id` |
| `purge_task` | Permanently delete a single task from trash | `task_id` |
| `purge_all_trash` | Permanently delete all tasks in trash | — |

### Category Tools

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `list_categories` | List all categories | — |
| `get_category` | Get a single category by ID | `category_id` |
| `create_category` | Create a new category | `label`, `color?` |
| `update_category` | Update a category | `category_id`, `label?`, `color?` |
| `delete_category` | Permanently delete a category | `category_id` |

### Startup

Auto-started via Hermes Agent `mcp_servers` config (requires restart):

```yaml
mcp_servers:
  focusflow:
    command: /mnt/e/focusflow/backend/.venv/Scripts/python.exe
    args: [/mnt/e/focusflow/backend/mcp_server.py]
    timeout: 120
    connect_timeout: 60
```

Or manually:

```bash
cd /mnt/e/focusflow/backend
python mcp_server.py
```