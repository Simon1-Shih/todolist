# 軟體設計文件 (SDD) - FocusFlow

## 1. 概述

FocusFlow 是一個現代化的單頁應用程式 (SPA)，用於高效地管理任務、排程和分類。應用程式允許使用者按時間和優先級對任務進行排序，透過模擬簡單目錄互動的原生分類管理，以及透過互動式日曆動態排程任務。

## 2. 架構概述

FocusFlow 是一個**全端應用程式**，前端使用 React，後端使用 Flask，透過 RESTful JSON API 通信。

### 前端
**前端框架：** React 18.x 搭配 TypeScript
**建置工具：** Vite
**樣式：** Tailwind CSS v4 (Utility-first CSS)
**圖示：** `lucide-react`
**動畫：** `motion/react` (Framer Motion)
**狀態管理：** React Hooks (`useState`, `useMemo`) — 本機元件狀態與狀態提升至 `App.tsx`。前端狀態透過 API 與後端同步。

### 後端
**後端框架：** Flask (Python 3.x)
**資料庫：** SQLite via SQLAlchemy ORM
**CORS：** `flask-cors` 用於前後端跨域通信
**架構：** Flask MVC 模式 — Models（資料層）、Controllers（業務邏輯層）、Views（API 路由層）

### MCP Server
**框架：** `fastmcp`
**用途：** 將 FocusFlow 的 task/category 管理功能以 MCP tools 形式暴露，供 Hermes Agent 等 AI 工具呼叫
**啟動方式：** `python backend/mcp_server.py`（或透過 Hermes Agent 的 `mcp_servers` 設定自動啟動）
**可用工具：** `list_tasks`, `get_task`, `create_task`, `update_task`, `toggle_task_complete`, `toggle_task_important`, `delete_task`, `restore_task`, `purge_task`, `purge_all_trash`, `list_categories`, `get_category`, `create_category`, `update_category`, `delete_category`

## 3. 目錄結構

```
/mnt/e/focusflow/                # 專案根目錄（WSL 路徑）
├── CLAUDE.md                    # Claude Code 開發指引
├── SDD.md / SDD_CN.md           # 軟體設計文件（中英文）
├── README.md                    # 專案說明
├── settings.local.json          # 本地設定
│
├── backend/                     # 後端原始碼 (Flask MVC)
│   ├── wsgi.py                  # Flask 應用入口與初始化
│   ├── config.py                # 設定檔 (DB、CORS 等)
│   ├── mcp_server.py            # MCP Server（fastmcp 框架）
│   ├── requirements.txt         # Python 依賴
│   ├── models/                  # 資料模型 (SQLAlchemy ORM)
│   │   ├── __init__.py           # 資料庫與模型匯出
│   │   ├── task.py              # Task 模型
│   │   └── category.py          # Category 模型
│   ├── controllers/             # 業務邏輯層 (控制器)
│   │   ├── __init__.py
│   │   ├── task_controller.py   # 任務業務邏輯
│   │   └── category_controller.py # 分類業務邏輯
│   └── views/                   # API 路由層 (視圖)
│       ├── __init__.py
│       ├── task_views.py        # 任務 API 路由
│       └── category_views.py    # 分類 API 路由
│
├── frontend/                    # 前端原始碼 (React SPA)
│   ├── package.json             # npm 依賴
│   ├── vite.config.ts           # Vite 設定
│   ├── index.html               # HTML 入口
│   ├── dist/                    # 正式版建置輸出
│   └── src/                     # 原始碼
│       ├── main.tsx             # React 入口點
│       ├── App.tsx              # 主要整合器與狀態協調器
│       ├── index.css            # 全域 CSS 與 Tailwind 入口
│       ├── api.ts               # API 呼叫封裝
│       ├── components/          # 可複用/UI 元件
│       │   ├── AddTaskModal.tsx # 新增或編輯任務的彈窗表單
│       │   ├── Header.tsx       # 上方導航列（搜尋、視圖切換、個人資料、鈴鐺、設定）
│       │   └── Sidebar.tsx       # 左側導航（分類管理、篩選、回收桶）
│       └── views/               # 主要路由/螢幕頁面
│           ├── Dashboard.tsx    # 任務列表渲染、搜尋與指標小工具
│           └── CalendarView.tsx # 視覺化日曆渲染任務點/橫條
│
└── instance/
    └── focusflow.db             # SQLite 資料庫檔案
```

## 4. 狀態管理

FocusFlow 使用**雙層狀態架構**：本地前端狀態用於 UI 響應性，後端持久化狀態用於資料耐久性。

### 前端狀態 (React)

大部分應用核心狀態位於 `App.tsx` 以維持單一真相來源，同時透過 API 與後端同步：
* **`tasks: Task[]`** - 核心狀態陣列，持有所有任務。任務支援多個分類（透過 `categoryIds: number[]`）與軟刪除（透過 `isDeleted?: boolean` 旗標）。
* **`categories: Category[]`** - 核心分類列表，對應使用者定義的資料夾（分類）。
* **`currentFilter: string`** - 追蹤導航狀態，在預先定義的篩選（`'all' | 'today' | 'important' | 'completed' | 'trash'`）或動態（`'category-{id}'`）之間切換。
* **`searchQuery: string`** - 繫結於 `Dashboard`，支援關鍵字搜尋和日期區間篩選，透過計算的 `useMemo` 區塊過濾 `tasks`。
* **`viewMode: 'list' | 'calendar'`** - 目前檢視模式。
* **`calendarSelectedDate: Date | null`** - 日曆中選取的日期，點擊後切換至「今天」篩選並預填充新增任務的日期。

### 後端狀態 (Flask + SQLAlchemy + SQLite)
* **`Task` 模型** — 對應資料庫 `tasks` 資料表，包含所有任務欄位與關聯。
* **`Category` 模型** — 對應資料庫 `categories` 資料表，包含分類資訊與多對多關聯。
* **`task_categories`** — 任務與分類之間的多對多關聯資料表。

### 排序優先級實現

`App.tsx` 中的 `useMemo`（`sortedTasks`）確保 `tasks` 持續被正確過濾與排序：
1. **日期（升冪）：** 將同日期任務分組。
2. **時間（升冪）：** 解決同日期任務的相對順序（`undefined` 視為 `00:00`）。
3. **優先級（降冪）：** 在相同時間槽或時間未定義時，回退至優先級順序（`High` → `Medium` → `Low`）。

### 前端-後端資料同步

前端透過 `fetch()` 或 `axios` 向 Flask 後端發送 API 呼叫。每個前端變更（建立、更新、刪除）都會立即觸發對應的 API 呼叫，根據後端回應（成功或錯誤）決定是否更新前端狀態或回滾。

### 前端本地快取與樂觀 UI 更新

前端在變更後先樂觀地更新本地狀態，再向後端發送 API 請求。若請求失敗則回滾本地狀態，以提升操作流暢度。

## 5. 元件詳細說明

### `App.tsx`（控制器）

定義 `Category` 和 `Task` TypeScript 介面。協調回呼函式（`handleSaveTask`, `handleToggleComplete`, `handleDeleteCategory` 等），傳遞至功能型展示元件。管理全域 UI 約束（例如 `select-none` 全域停用使用者文字選取）。包含 `index.css` 中的視覺捲軸停用邏輯。所有狀態變更都會觸發對應的後端 API 呼叫。

### `Sidebar.tsx`（導航與分類管理）

包含上下文選單（`onContextMenu`）用於刪除/重新命名分類、空白處右鍵新增分類，以及含有「清空回收桶」功能的回收桶資料夾。預先定義的任務篩選器包括「所有任務」、「今天」、「重要」、「已完成」和「回收桶」。分類操作（`onAddCategory`, `onRenameCategory`, `onDeleteCategory`）會同步至後端。

### `Header.tsx`（全域工具）

包含視圖切換按鈕（List / Calendar）、搜尋列（支援關鍵字與日期區間篩選）、鈴鐺通知圖示、個人資料頭像與設定按鈕。新增任務按鈕位於各視圖內的明顯位置。

### `Dashboard.tsx`（任務列表視圖）

渲染標準列表變體。任務迭代檢查勾選狀態、優先級、多選分類（`categoryIds`）、到期時間（`time`）、預估工時（`estimatedTime`），以及可選的 `description`。動態追蹤計算數量：
* 活躍分類數量
* 任務總數
* 已完成任務數量

內建搜尋列用於追蹤任務標題與日期區間篩選，在頁面標頭直接承載主要的「新增任務」按鈕，並使用 `motion/react` 來流暢地展開/收合任務 `description`，僅在任務懸停時展開。在非「已完成」與「所有任務」視圖下，已完成的任務預設隱藏。

### `CalendarView.tsx`（日曆視圖）

使用生成式網格計算本機 `Date` 上下文，繪製最多 6 列。在任何儲存格上雙擊會觸發 `onAddTask`，並預先填充相對時間戳記。在日曆標頭直接承載主要的「新增任務」按鈕。日曆資料從後端 API 按日期分組取得。

## 6. 後端 API 設計 (Flask RESTful)

### 任務 API (`/api/tasks`)

| 方法 | 路由 | 說明 |
|------|------|------|
| GET | `/api/tasks` | 取得所有任務（支援查詢參數：`filter`、`sort_by`、`sort_order`、`search`） |
| GET | `/api/tasks/<id>` | 取得單一任務 |
| POST | `/api/tasks` | 建立新任務 |
| PUT | `/api/tasks/<id>` | 更新任務 |
| PATCH | `/api/tasks/<id>/toggle-complete` | 切換完成狀態 |
| PATCH | `/api/tasks/<id>/toggle-important` | 切換重要狀態 |
| DELETE | `/api/tasks/<id>` | 軟刪除任務（移至回收桶） |
| DELETE | `/api/tasks/purge` | 永久刪除回收桶中的所有任務 |

### 分類 API (`/api/categories`)

| 方法 | 路由 | 說明 |
|------|------|------|
| GET | `/api/categories` | 取得所有分類 |
| POST | `/api/categories` | 建立新分類 |
| PUT | `/api/categories/<id>` | 更新分類（重新命名/改顏色） |
| DELETE | `/api/categories/<id>` | 刪除分類 |

### 查詢參數（任務列表）

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `filter` | string | `all` | `all`, `today`, `important`, `completed`, `trash`, `category-{id}` |
| `sort_by` | string | `date` | `date`, `time`, `priority` |
| `sort_order` | string | `asc` | `asc`, `desc` |
| `search` | string | `""` | 關鍵字搜尋任務標題 |

### 回應格式

所有 API 回應遵循一致的 JSON 結構（成功時）：

```json
{
  "success": true,
  "tasks": [...],
  "count": N
}
```

或針對單一資源：

```json
{
  "success": true,
  "task": {...}
}
```

錯誤回應：

```json
{
  "success": false,
  "error": "錯誤描述"
}
```

## 7. 資料模型

### Task 模型

```python
class Task(db.Model):
    id: int           # 主鍵，自動遞增
    title: str        # 任務標題（必填）
    description: str  # 任務描述（可選，預設："")
    date: date        # 到期日期（YYYY-MM-DD）
    time: time        # 到期時間（HH:MM，可選）
    estimated_time: int | None  # 預估工時（分鐘，可選）
    priority: str     # 優先級：'High' | 'Medium' | 'Low'（預設：'Medium'）
    completed: bool   # 是否完成（預設：False）
    important: bool   # 是否重要（預設：False）
    is_deleted: bool   # 軟刪除旗標（預設：False）
    categories: list[Category]  # 多對多關聯
```

### Category 模型

```python
class Category(db.Model):
    id: int           # 主鍵，自動遞增
    label: str        # 分類標籤名稱
    color: str        # CSS 顏色類別（例如：'bg-red-500'）
```

### 多對多關聯表

```python
task_categories = db.Table('task_categories',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True)
)
```

## 8. 開發指令

```bash
# 後端
cd backend
pip install -r requirements.txt
python wsgi.py          # 啟動 Flask 開發伺服器（預設：5000）

# 或使用 venv
./.venv/Scripts/python.exe wsgi.py

# 前端
cd frontend
npm run dev            # 啟動 Vite 開發伺服器（預設：3000）
npm run build          # 生產環境建置
npm run preview        # 預覽生產環境
npm run lint           # TypeScript 類型檢查
```

## 9. 技術棧總覽

| 層級 | 技術 |
|------|------|
| 前端框架 | React 18.x + TypeScript |
| 後端框架 | Flask (Python 3.x) |
| 資料庫 | SQLite (SQLAlchemy ORM) |
| 樣式 | Tailwind CSS v4 |
| 動畫 | Framer Motion (`motion/react`) |
| 圖示 | lucide-react |
| 建置工具 | Vite |
| 前端依賴管理 | npm |
| 後端依賴管理 | pip / requirements.txt |
| CORS | flask-cors（前後端分離跨域） |
| MCP Server | fastmcp（Task/Category CRUD tools） |

## 10. 未實作的擴展目標（UI 元素 vs 邏輯實作）

以下 UI 功能反映在樣式/設計稿中，但缺乏完整的 JavaScript 後端功能支援：

| 功能 | 元件 | 現況 |
|------|------|------|
| **個人資料** | Header | 圖片是靜態的；未實作彈窗驗證邏輯 |
| **通知中心** | Header / 鈴鐺圖示 | 靜態懸停圖示，無通知中心 |
| **設定頁面** | Header / 側邊欄 | 設定/選單未綁定 |
| **每日專注分數** | Dashboard 指標卡片 | `84 (+12%)` 是任意佈局範例，需要指標計算邏輯 |
| **歸檔功能** | 側邊欄 | 「歸檔」按鈕存在，但 Tasks 內部無 `archived: boolean` 屬性 |

## 11. MCP Server 工具清單

MCP Server（`backend/mcp_server.py`）提供以下 tools，透過 `fastmcp` 框架暴露：

### 任務工具（Task Tools）

| 工具名稱 | 說明 | 主要參數 |
|---------|------|---------|
| `list_tasks` | 列出任務（支援篩選、搜尋、排序） | `filter_type`, `search`, `sort_by`, `sort_order` |
| `get_task` | 取得單一任務 | `task_id` |
| `create_task` | 建立新任務 | `title`, `date`, `description?`, `time?`, `estimated_time?`, `priority?`, `category_ids?` |
| `update_task` | 更新任務（僅變更提供的欄位） | `task_id`, `title?`, `description?`, `date?`, `time?`, `estimated_time?`, `priority?`, `category_ids?` |
| `toggle_task_complete` | 切換完成狀態 | `task_id` |
| `toggle_task_important` | 切換重要狀態 | `task_id` |
| `delete_task` | 軟刪除任務（移至回收桶） | `task_id` |
| `restore_task` | 從回收桶還原任務 | `task_id` |
| `purge_task` | 永久刪除回收桶中的單一任務 | `task_id` |
| `purge_all_trash` | 永久刪除回收桶中的所有任務 | — |

### 分類工具（Category Tools）

| 工具名稱 | 說明 | 主要參數 |
|---------|------|---------|
| `list_categories` | 列出所有分類 | — |
| `get_category` | 取得單一分類 | `category_id` |
| `create_category` | 建立新分類 | `label`, `color?` |
| `update_category` | 更新分類 | `category_id`, `label?`, `color?` |
| `delete_category` | 永久刪除分類 | `category_id` |

### 啟動方式

透過 Hermes Agent 的 `mcp_servers` 設定自動啟動（需重啟 Hermes Agent）：

```yaml
mcp_servers:
  focusflow:
    command: /mnt/e/focusflow/backend/.venv/Scripts/python.exe
    args: [/mnt/e/focusflow/backend/mcp_server.py]
    timeout: 120
    connect_timeout: 60
```

或手動啟動：

```bash
cd /mnt/e/focusflow/backend
python mcp_server.py
```