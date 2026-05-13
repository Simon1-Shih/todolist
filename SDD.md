# Software Design Document (SDD) - FocusFlow

## 1. Introduction
FocusFlow is a modern, single-page application (SPA) built to manage tasks, schedules, and categories efficiently. The application allows users to sort tasks by time and priority, manage categories natively by mimicking simple directory interactions, and schedule tasks dynamically via an interactive calendar.

## 2. Architecture Overview
**Frontend Framework:** React 18.x with TypeScript
**Build Tool:** Vite
**Styling:** Tailwind CSS (Utility-first CSS)
**Icons:** `lucide-react`
**State Management:** React Hooks (`useState`, `useMemo`) - Local component state & Lifting state up to `App.tsx`.

The application follows a **Monolithic Frontend** structure focusing on local state management and passing state top-down.

## 3. Directory Structure
```
/src
 ├── main.tsx              // React Entry Point
 ├── App.tsx               // Main Integrator & State Orchestrator
 ├── index.css             // Global CSS & Tailwind Entry
 ├── components/           // Reusable/UI Components
 │   ├── AddTaskModal.tsx  // Modal form to add or edit tasks
 │   ├── Header.tsx        // Top Navigation Header mapping search & action buttons
 │   └── Sidebar.tsx       // Left Navigation mapping categories & filters
 └── views/                // Primary Route/Screen Views
     ├── CalendarView.tsx  // Visual real-world calendar rendering task dots/strips
     └── Dashboard.tsx     // Task list rendering, searching, and metrics widget
```

## 4. State Management
Most application core state resides in `App.tsx` to maintain a single source of truth without adopting heavy Redux-like libraries at this early stage.
* **`tasks: Task[]`** - Core state array holding all tasks. Tasks support multiple categories via `categoryIds: string[]` and soft deletion via the `isDeleted?: boolean` flag.
* **`categories: Category[]`** - Core state list mapping user-defined folders (categories). Contains a built-in "completed" filter in the Sidebar.
* **`currentView: string`** - Tracks navigation state between predefined lists (`list`, `today`, `important`, `completed`, `calendar`, `trash`) or dynamically (`category-{id}`).
* **`searchQuery: string`** - Bound to `Dashboard`, filters the `tasks` via a computed `useMemo` block.

### Sorting Priority Implementation
`useMemo` in `App.tsx` ensures `tasks` are continuously filtered and sorted correctly:
1.  **Date (Ascending):** Groups tasks falling into the same date.
2.  **Time (Ascending):** Solves relative task order on the same day.
3.  **Priority (Descending):** Falls back to priority order (`High` -> `Medium` -> `Low`) on the same time slot or if time is undefined.

## 5. Component Details

### `App.tsx` (Controller)
Defines interfaces `Category` and `Task`. Coordinates callbacks (`handleSaveTask`, `handleToggleComplete`, `handleDeleteCategory`, etc.) passed down to functional presentation components. Manages global UI constraints (e.g., `select-none` to globally disable user text selection). Includes visual scrollbar disabling logic in `index.css`.

### `Sidebar.tsx` (Navigation & Category Management)
Features context menus (`onContextMenu`) for deleting/renaming categories, creating new categories via empty space right-click, and a Trash folder with "Empty Trash" functionality. Predefined task filters include 'All Tasks', 'Today', 'Important', 'Completed', and 'Trash'.

### `Header.tsx` (Global Utilities)
No longer hosts the Add Task action (moved to views for context). Exposes the main profile toggle and potentially notifications, along with basic layout scaffolding.

### `Dashboard.tsx`
Renders standard List variants. Tasks are iterated mapping checks, priorities, multiselect categories (`categoryIds`), due time (`time`), effort (`estimatedTime`), and an optional `description`. Tracks calculated counts dynamically:
* Active Categories length
* Total Tasks length
* Completed Tasks length
Also includes an inline search bar for tracking task titles, hosts a primary 'Add Task' button directly in the view header, and uses `motion/react` to fluidly un-collapse the task `description` exclusively when hovering over a task.

### `CalendarView.tsx`
Uses a generative grid computing local `Date` contexts to draw up up to 6 rows. Double-clicking any cell dispatches the `onAddTask` with relative timestamps pre-populated. Hosts a primary 'Add Task' button directly in the calendar header.

## 6. Unimplemented Extensibility Targets (UI Elements vs Logic implementation)
A list of UI features that reflect in styles/mockups but lack full javascript underlying feature enablement:
* **User Profile (Header):** Image is static; no modal auth logic implemented.
* **Notifications (Header/Bell icon):** Static hover icon, no notification center.
* **Settings (Header/Sidebar):** Config settings/menu unmapped.
* **Daily Focus Score:** The numeric logic `84 (+12%)` is an arbitrary layout sample. Needs metrics derivation.
* **Archive Feature:** Sidebar 'Archive' button doesn't correspond to an internal `archived: boolean` attribute inside Tasks currently.
