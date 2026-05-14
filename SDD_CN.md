# 軟體設計文件 (SDD) - FocusFlow

## 1. 概述

FocusFlow 是一個現代化的單頁應用程式 (SPA)，用於高效地管理任務、排程和分類。應用程式允許使用者按時間和優先級對任務進行排序，透過模擬簡單目錄互動的原生分類管理，以及透過互動式日曆動態排程任務。

## 2. 架構概述

**前端框架：** React 18.x 搭配 TypeScript
**建置工具：** Vite
**樣式：** Tailwind CSS (Utility-first CSS)
**圖示：** `lucide-react`
**狀態管理：** React Hooks (`useState`, `useMemo`) — 本機元件狀態與狀態提升至 `App.tsx`。
**後端框架：** Flask (Python) — RESTful API

應用採用**前端單體 + 後端 RESTful API** 的架構，前端透過 HTTP 請求與 Flask 後端通信。

## 3. 目錄結構

```
/src/                        # 前端原始碼
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

/backend/                     # 後端原始碼 (Flask MVC)
 ├── app.py                # Flask 應用入口與初始化
 ├── config.py             # 設定檔 (DB、JWT 等)
 ├── models/               # 資料模型 (SQLAlchemy ORM)
 │   ├── __init__.py       # 模型匯出
 │   ├── task.py           # Task 模型
 │   └── category.py       # Category 模型
 ├── controllers/          # 業務邏輯層 (控制器)
 │   ├── __init__.py
 │   ├── task_controller.py # 任務業務邏輯
 │   └── category_controller.py # 分類業務邏輯
 ├── views/                # API 路由層 (視圖)
 │   ├── __init__.py
 │   ├── task_views.py     # 任務 API 路由
 │   └── category_views.py # 分類 API 路由
 └── utils/                # 工具函式
     └── helpers.py        # 共用工具函式
```

## 4. 狀態管理

應用程式核心狀態分為前後端兩層：

### 前端狀態 (React)
大部分應用核心狀態位於 `App.tsx` 以維持單一真相來源，同時透過 API 與後端同步：
* **`tasks: Task[]`** - 核心狀態陣列，持有所有任務。任務支援多個分類 (透過 `categoryIds: string[]`) 與軟刪除 (透過 `isDeleted?: boolean` 旗標)。
* **`categories: Category[]`** - 核心分類列表，對應使用者定義的資料夾 (分類)。內建「已完成」篩選於側邊欄中。
* **`currentView: string`** - 追蹤導航狀態，在預先定義的列表 (`list`, `today`, `important`, `completed`, `calendar`, `trash`) 或動態 (`category-{id}`) 之間切換。
* **`searchQuery: string`** - 繫結於 `Dashboard`，透過計算的 `useMemo` 區塊過濾 `tasks`。

### 後端狀態 (Flask + SQLAlchemy + SQLite)
* **`Task` 模型** — 對應資料庫 `tasks` 資料表，包含所有任務欄位與關聯。
* **`Category` 模型** — 對應資料庫 `categories` 資料表，包含分類資訊與多對多關聯。
* **`task_categories`** — 任務與分類之間的多對多關聯資料表。

## 5. 排序優先級實現

`App.tsx` 中的 `useMemo` 確保 `tasks` 持續被正確過濾與排序：
1. **日期 (升冪)：** 將同日期任務分組。
2. **時間 (升冪)：** 解決同日期任務的相對順序。
3. **優先級 (降冪)：** 在相同時間槽或時間未定義時，回退至優先級順序 (`High` → `Medium` → `Low`)。

後端 API 也提供排序參數，前端可選擇後端排序或前端排序。

## 6. 元件詳細說明

### `App.tsx` (控制器)
定義 `Category` 和 `Task` 介面。協調回呼函式 (`handleSaveTask`, `handleToggleComplete`, `handleDeleteCategory` 等)，傳遞至功能型展示元件。管理全域 UI 約束 (例如 `select-none` 全域停用使用者文字選取)。包含 `index.css` 中的視覺捲軸停用邏輯。

### `Sidebar.tsx` (導航與分類管理)
包含上下文選單 (`onContextMenu`) 用於刪除/重新命名分類、空白處右鍵新增分類，以及含有「清空回收桶」功能的回收桶資料夾。預先定義的任務篩選器包括「所有任務」、「今天」、「重要」、「已完成」和「回收桶」。

### `Header.tsx` (全域工具)
不再承載新增任務操作 (已移至頁面以保留上下文)。暴露主要個人資料切換和潛在通知，以及基本佈局框架。

### `Dashboard.tsx`
渲染標準列表變體。任務迭代檢查勾選狀態、優先級、多選分類 (`categoryIds`)、到期時間 (`time`)、預估工時 (`estimatedTime`)，以及可選的 `description`。動態追蹤計算數量：
* 活躍分類數量
* 任務總數
* 已完成任務數量
內建搜尋列用於追蹤任務標題，在頁面標頭直接承載主要的「新增任務」按鈕，並使用 `motion/react` 來流暢地展開/收合任務 `description`，僅在任務懸停時展開。

### `CalendarView.tsx`
使用生成式網格計算本機 `Date` 上下文，繪製最多 6 列。在任何儲存格上雙擊會觸發 `onAddTask`，並預先填充相對時間戳記。在日曆標頭直接承載主要的「新增任務」按鈕。

## 7. 未實作的擴展目標 (UI 元素 vs 邏輯實作)

以下 UI 功能反映在樣式/設計稿中，但缺乏完整的 JavaScript 後端功能支援：
* **個人資料 (Header)：** 圖片是靜態的；未實作彈窗驗證邏輯。
* **通知 (Header/鈴鐺圖示)：** 靜態懸停圖示，無通知中心。
* **設定 (Header/側邊欄)：** 設定/選單未綁定。
* **每日專注分數：** 數值邏輯 `84 (+12%)` 是任意佈局範例。需要指標計算。
* **歸檔功能：** 側邊欄「歸檔」按鈕目前不對應 Tasks 內部的 `archived: boolean` 屬性。

## 8. 後端 API 設計 (Flask RESTful)

### 任務 API (`/api/tasks`)

| 方法 | 路由 | 說明 |
|------|------|------|
| GET | `/api/tasks` | 取得所有任務 (支援查詢參數: `filter`, `sort`, `search`) |
| GET | `/api/tasks/:id` | 取得單一任務 |
| POST | `/api/tasks` | 建立新任務 |
| PUT | `/api/tasks/:id` | 更新任務 |
| PATCH | `/api/tasks/:id/toggle-complete` | 切換完成狀態 |
| PATCH | `/api/tasks/:id/toggle-important` | 切換重要狀態 |
| DELETE | `/api/tasks/:id` | 軟刪除任務 (移至回收桶) |
| DELETE | `/api/tasks/purge` | 永久刪除回收桶中的任務 |

### 分類 API (`/api/categories`)

| 方法 | 路由 | 說明 |
|------|------|------|
| GET | `/api/categories` | 取得所有分類 |
| POST | `/api/categories` | 建立新分類 |
| PUT | `/api/categories/:id` | 更新分類 |
| DELETE | `/api/categories/:id` | 刪除分類 |

### 查詢參數 (任務列表)

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `filter` | string | `all` | `all`, `today`, `important`, `completed`, `trash`, `category-{id}` |
| `sort_by` | string | `date` | `date`, `time`, `priority` |
| `sort_order` | string | `asc` | `asc`, `desc` |
| `search` | string | `""` | 關鍵字搜尋任務標題 |

## 9. 資料模型

### Task 模型

```python
class Task(db.Model):
    id: int           # 主鍵，自動遞增
    title: str        # 任務標題 (必填)
    description: str  # 任務描述 (可選)
    date: date        # 到期日期
    time: time        # 到期時間 (可選)
    estimated_time: int | None  # 預估工時 (分鐘，可選)
    priority: str     # 優先級: 'High' | 'Medium' | 'Low'
    completed: bool   # 是否完成
    important: bool   # 是否重要
    is_deleted: bool  # 軟刪除旗標 (是否已移至回收桶)
    category_ids: list[Category]  # 多對多關聯
```

### Category 模型

```python
class Category(db.Model):
    id: int           # 主鍵，自動遞增
    label: str        # 分類標籤名稱
    color: str        # CSS 顏色類別
```

### 多對多關聯表

```python
task_categories = db.Table('task_categories',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True)
)
```

## 10. 開發指令

```bash
# 後端
cd app
pip install -r requirements.txt
python app.py          # 啟動 Flask 開發伺服器 (預設 :5000)

# 前端
npm run dev            # 啟動 Vite 開發伺服器 (預設 :3000)
npm run build          # 生產環境建置
npm run preview        # 預覽生產環境
npm run lint           # TypeScript 類型檢查
```

## 11. 技術棧總覽

| 層級 | 技術 |
|------|------|
| 前端框架 | React 18.x + TypeScript |
| 後端框架 | Flask (Python 3.x) |
| 資料庫 | SQLite (SQLAlchemy ORM) |
| 樣式 | Tailwind CSS v4 |
| 動畫 | Framer Motion (`motion/react`) |
| 圖示 | lucide-react |
| 建置工具 | Vite |
| 依賴管理 (前端) | npm |
| 依賴管理 (後端) | pip / requirements.txt |
| CORS | flask-cors (前後端分離跨域) |
