# Software Design Document (SDD) - FocusFlow

## 1. Introduction
FocusFlow is a modern, single-page application (SPA) built to manage tasks, schedules, and categories efficiently. The application allows users to sort tasks by time and priority, manage categories natively by mimicking simple directory interactions, and schedule tasks dynamically via an interactive calendar.

## 2. Architecture Overview

FocusFlow is a **full-stack application** with a React frontend and Flask backend communicating via RESTful JSON APIs.

### Frontend
**Frontend Framework:** React 18.x with TypeScript
**Build Tool:** Vite
**Styling:** Tailwind CSS (Utility-first CSS)
**Icons:** `lucide-react`
**Animation:** `motion/react` (Framer Motion)
**State Management:** React Hooks (`useState`, `useMemo`) — local component state, lifted to `App.tsx`. Frontend state is synced with backend via API calls.

### Backend
**Backend Framework:** Flask (Python 3.x)
**Database:** SQLite via SQLAlchemy ORM
**CORS:** `flask-cors` for frontend-backend cross-origin communication
**Architecture:** Flask MVC pattern — Models (data layer), Controllers (business logic), Views (API routes)

The frontend follows a **component-based SPA** structure. The backend follows a **three-tier MVC** pattern. Both communicate via stateless JSON REST API over HTTP.

## 3. Directory Structure

```
/src                          # 前端原始碼
 ├── main.tsx              # React 入口點
 ├── App.tsx               # 主要整合器與狀態協調器
 ├── index.css             # 全域 CSS 與 Tailwind 入口
 ├── components/           # 可複用/UI 元件
 │   ├── AddTaskModal.tsx  # 新增或編輯任務的彈窗表單
 │   ├── Header.tsx        # 上方導航列，對應搜尋與操作按鈕
 │   └── Sidebar.tsx       # 左側導航，對應分類與篩選器
 └── views/                # 主要路由/螢幕頁面
     ├── CalendarView.tsx  # 視覺化日曆渲染任務點/橫條
     └── Dashboard.tsx     # 任務列表渲染、搜尋與指標小工具

/app                        # 後端原始碼 (Flask MVC)
 ├── wsgi.py                # Flask 應用入口與初始化 (Flask 標準慣例)
 ├── config.py             # 設定檔 (DB、CORS 等)
 ├── models/               # 資料模型 (SQLAlchemy ORM)
 │   ├── __init__.py       # 資料庫與模型匯出
 │   ├── task.py           # Task 模型
 │   └── category.py       # Category 模型
 ├── controllers/          # 業務邏輯層 (控制器)
 │   ├── __init__.py
 │   ├── task_controller.py   # 任務業務邏輯
 │   └── category_controller.py # 分類業務邏輯
 └── views/                # API 路由層 (視圖)
     ├── __init__.py
     ├── task_views.py      # 任務 API 路由
     └── category_views.py  # 分類 API 路由
```

## 4. State Management

FocusFlow uses a **dual-layer state architecture**: local frontend state for UI responsiveness and backend persistent state for data durability.

### Frontend State (React)
Most application core state resides in `App.tsx` to maintain a single source of truth without adopting heavy Redux-like libraries at this early stage. Frontend state is synced with the backend via API calls.
* **`tasks: Task[]`** - Core state array holding all tasks. Tasks support multiple categories via `categoryIds: string[]` and soft deletion via the `isDeleted?: boolean` flag.
* **`categories: Category[]`** - Core state list mapping user-defined folders (categories). Contains a built-in "completed" filter in the Sidebar.
* **`currentView: string`** - Tracks navigation state between predefined lists (`list`, `today`, `important`, `completed`, `calendar`, `trash`) or dynamically (`category-{id}`).
* **`searchQuery: string`** - Bound to `Dashboard`, filters the `tasks` via a computed `useMemo` block.

### Backend State (Flask + SQLAlchemy + SQLite)
* **`Task` model** — mapped to database `tasks` table, stores all task fields and associations.
* **`Category` model** — mapped to database `categories` table, stores category info and many-to-many associations.
* **`task_categories`** — many-to-many association table between tasks and categories.

### Sorting Priority Implementation
`useMemo` in `App.tsx` ensures `tasks` are continuously filtered and sorted correctly:
1.  **Date (Ascending):** Groups tasks falling into the same date.
2.  **Time (Ascending):** Solves relative task order on the same day.
3.  **Priority (Descending):** Falls back to priority order (`High` -> `Medium` -> `Low`) on the same time slot or if time is undefined.

### Frontend-Backend Data Sync
The frontend makes API calls to the Flask backend via `fetch()` or `axios`. Every mutation (create, update, delete) in the frontend is immediately followed by a corresponding API call. The backend response (or error) determines whether the frontend state is updated or rolled back.

## 5. Component Details

### `App.tsx` (Controller)
Defines interfaces `Category` and `Task`. Coordinates callbacks (`handleSaveTask`, `handleToggleComplete`, `handleDeleteCategory`, etc.) passed down to functional presentation components. Manages global UI constraints (e.g., `select-none` to globally disable user text selection). Includes visual scrollbar disabling logic in `index.css`. All state mutations trigger corresponding backend API calls.

### `Sidebar.tsx` (Navigation & Category Management)
Features context menus (`onContextMenu`) for deleting/renaming categories, creating new categories via empty space right-click, and a Trash folder with "Empty Trash" functionality. Predefined task filters include 'All Tasks', 'Today', 'Important', 'Completed', and 'Trash'. Category operations (`onAddCategory`, `onRenameCategory`, `onDeleteCategory`) are synced to the backend.

### `Header.tsx` (Global Utilities)
No longer hosts the Add Task action (moved to views for context). Exposes the main profile toggle and potentially notifications, along with basic layout scaffolding.

### `Dashboard.tsx`
Renders standard List variants. Tasks are iterated mapping checks, priorities, multiselect categories (`categoryIds`), due time (`time`), effort (`estimatedTime`), and an optional `description`. Tracks calculated counts dynamically:
* Active Categories length
* Total Tasks length
* Completed Tasks length
Also includes an inline search bar for tracking task titles, hosts a primary 'Add Task' button directly in the view header, and uses `motion/react` to fluidly un-collapse the task `description` exclusively when hovering over a task. Search queries may be sent to the backend for server-side filtering.

### `CalendarView.tsx`
Uses a generative grid computing local `Date` contexts to draw up to 6 rows. Double-clicking any cell dispatches the `onAddTask` with relative timestamps pre-populated. Hosts a primary 'Add Task' button directly in the calendar header. Calendar data is fetched from the backend API grouped by date.

## 6. Backend API Design (Flask RESTful)

### Task API (`/api/tasks`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | Get all tasks (supports query params: `filter`, `sort`, `search`) |
| GET | `/api/tasks/<id>` | Get a single task by ID |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/<id>` | Update a task |
| PATCH | `/api/tasks/<id>/toggle-complete` | Toggle task completion status |
| PATCH | `/api/tasks/<id>/toggle-important` | Toggle task importance flag |
| DELETE | `/api/tasks/<id>` | Soft delete task (move to trash) |
| DELETE | `/api/tasks/purge` | Permanently delete all trash tasks |

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

All API responses follow a consistent JSON structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description",
  "status_code": 400
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
    time: time        # Due time (HH:MM, optional, default: None)
    estimated_time: int | None  # Estimated duration in minutes (optional)
    priority: str     # Priority level: 'High', 'Medium', 'Low'
    completed: bool   # Whether task is completed (default: False)
    important: bool   # Whether task is marked important (default: False)
    is_deleted: bool  # Soft-delete flag (default: False)
    category_ids: list[Category]  # Many-to-many relationship
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
# 後端
cd app
pip install -r requirements.txt
python wsgi.py          # Start Flask dev server (default port: 5000)

# 或使用 FLASK 命令
export FLASK_APP=wsgi.py
flask run --host=0.0.0.0 --port=5000 --debug

# Frontend
cd frontend
npm run dev            # Start Vite dev server (default port: 3000)
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

## 6. Unimplemented Extensibility Targets (UI Elements vs Logic implementation)
A list of UI features that reflect in styles/mockups but lack full javascript underlying feature enablement:
* **User Profile (Header):** Image is static; no modal auth logic implemented.
* **Notifications (Header/Bell icon):** Static hover icon, no notification center.
* **Settings (Header/Sidebar):** Config settings/menu unmapped.
* **Daily Focus Score:** The numeric logic `84 (+12%)` is an arbitrary layout sample. Needs metrics derivation.
* **Archive Feature:** Sidebar 'Archive' button doesn't correspond to an internal `archived: boolean` attribute inside Tasks currently.
