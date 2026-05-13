# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: FocusFlow

A React + Vite task management SPA with list and calendar views. Built with TypeScript, Tailwind CSS v4, and Framer Motion for animations. State is managed via React Hooks in `App.tsx` (no external state library).

## Commands

```
npm run dev       # Start dev server (port 3000, binds 0.0.0.0)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run clean     # Remove dist/ directory
npm run lint      # TypeScript type-check (tsc --noEmit)
```

## Architecture

```
src/
├── App.tsx                    # State orchestrator (tasks, categories, filters, sorting)
├── main.tsx                   # Entry point
├── index.css                  # Global styles & Tailwind
├── components/
│   ├── Sidebar.tsx            # Navigation, category management (CRUD via context menus)
│   ├── Header.tsx             # Top bar: view toggle (List/Calendar), profile, bell, settings
│   └── AddTaskModal.tsx       # Modal for creating/editing tasks with category assignment
└── views/
    ├── Dashboard.tsx          # Task list view + metrics widgets
    └── CalendarView.tsx       # Monthly calendar grid with task dots/strips
```

### State model (all in `App.tsx`)

- **`tasks: Task[]`** — each task has `id`, `title`, `description?`, `date`, `time?`, `estimatedTime?`, `categoryIds[]`, `priority` (High/Medium/Low), `completed`, `important`, `isDeleted?` (soft delete for trash).
- **`categories: Category[]`** — each has `id`, `label`, `color` (CSS class).
- **`currentFilter`** — string: `'all' | 'today' | 'important' | 'completed' | 'trash'` or `'category-{id}'`.
- **`searchQuery`** — filters tasks via `useMemo`.
- **`viewMode`** — `'list' | 'calendar'`.

### Sorting

`sortedTasks` (useMemo) sorts by: 1) date asc, 2) time asc (undefined treated as `00:00`), 3) priority desc (High > Medium > Low).

### Key interactions

- Sidebar nav items set `currentFilter`. Calendar grid shows tasks per day; clicking a date sets `calendarSelectedDate` and switches to the "today" filter in list view. Double-clicking a calendar cell opens the Add Task modal pre-filled with that date.
- Task lifecycle: create via `AddTaskModal` → `handleSaveTask` (insert or update) → toggle complete/importance → soft-delete to trash → permanently delete from trash via `handleEmptyTrash`.
- Categories are created via sidebar "+" button or inline in `AddTaskModal`. Renamed/deleted via right-click context menus on sidebar items.
- The Dashboard view shows per-priority pending counts and a total/completed stat card.

### Unimplemented features (see SDD.md §6)

User Profile (static image), Notifications, Settings, Daily Focus Score logic, Archive feature (UI exists but no backing logic).
