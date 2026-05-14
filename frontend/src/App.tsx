import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './views/Dashboard';
import { AddTaskModal } from './components/AddTaskModal';
import { CalendarView } from './views/CalendarView';
import { api } from './api';

export interface Category {
  id: number;
  label: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  estimatedTime?: string;
  categoryIds: number[];
  priority: string;
  completed: boolean;
  important: boolean;
  isDeleted?: boolean;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function App() {
  const [currentFilter, setCurrentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialDate, setInitialDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始加載
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [taskData, catData] = await Promise.all([
          api.getTasks(),
          api.getCategories(),
        ]);
        setTasks(taskData || []);
        setCategories(catData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 當 filter / search 變化時，重新拉取 tasks（後端會做篩選和排序）
  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const params: Record<string, string> = {
          filter: currentFilter === 'trash' ? 'trash' :
                  currentFilter === 'today' ? 'today' :
                  currentFilter === 'important' ? 'important' :
                  currentFilter === 'completed' ? 'completed' :
                  currentFilter.startsWith('category-') ? currentFilter :
                  'all',
          search: searchQuery,
          sort_by: 'date',
          sort_order: 'asc',
        };
        const data = await api.getTasks(params);
        setTasks(data || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      }
    })();
  }, [currentFilter, searchQuery]);

  const handleOpenAddTask = (date?: string) => {
    setEditingTask(null);
    setInitialDate(date || (currentFilter === 'today' && calendarSelectedDate ? calendarSelectedDate : getTodayStr()));
    setIsAddTaskOpen(true);
  };

  const handleSelectFilter = (filter: string) => {
    setCurrentFilter(filter);
    setCalendarSelectedDate(null);
  };

  const handleSwitchView = (mode: 'list' | 'calendar') => {
    setViewMode(mode);
    if (mode === 'calendar') {
      setCalendarSelectedDate(null);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setInitialDate('');
    setIsAddTaskOpen(true);
  };

  const handleSaveTask = async (task: Task) => {
    try {
      if (editingTask) {
        const updated = await api.updateTask(task.id, {
          title: task.title,
          description: task.description || '',
          date: task.date,
          time: task.time || '',
          estimatedTime: task.estimatedTime || '',
          categoryIds: task.categoryIds,
          priority: task.priority,
        });
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await api.createTask({
          title: task.title,
          description: task.description || '',
          date: task.date,
          time: task.time || '',
          estimatedTime: task.estimatedTime || '',
          categoryIds: task.categoryIds,
          priority: task.priority,
        });
        setTasks(prev => [...prev, created]);
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleAddCategory = async (name: string): Promise<Category | undefined> => {
    if (!name || name.trim() === '') return undefined;
    try {
      const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-purple-500', 'bg-cyan-500'];
      const color = colors[categories.length % colors.length];
      const newCat = await api.createCategory({ label: name.trim(), color });
      setCategories(prev => [...prev, newCat]);
      return newCat;
    } catch (err) {
      console.error('Failed to create category:', err);
      return undefined;
    }
  };

  const handleRenameCategory = async (id: number, newLabel: string) => {
    if (!newLabel || newLabel.trim() === '') return;
    try {
      const updated = await api.updateCategory(id, { label: newLabel.trim() });
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      console.error('Failed to rename category:', err);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      if (currentFilter === `category-${id}`) {
        setCurrentFilter('all');
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleToggleImportant = async (taskId: number) => {
    try {
      const updated = await api.toggleImportant(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      console.error('Failed to toggle important:', err);
    }
  };

  const handleToggleComplete = async (taskId: number) => {
    try {
      const updated = await api.toggleComplete(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      console.error('Failed to toggle complete:', err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.isDeleted) {
      // 在 Trash（垃圾桶）裡按下刪除，只刪這一筆！
      try {
        await api.purgeSingleTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } catch (err) {
        console.error('Failed to permanently delete task:', err);
      }
    } else {
      try {
        const updated = await api.deleteTask(taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await api.purgeTasks();
      setTasks(prev => prev.filter(t => !t.isDeleted));
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  // 排序（前端補充排序，因為後端篩選後仍然會回傳所有匹配項目）
  const sortedTasks = useMemo(() => {
    let result = [...tasks];
    result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      const priorityOrder: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
    return result;
  }, [tasks]);

  let filteredTasks = sortedTasks;
  let viewTitle = 'All Tasks';
  let viewDesc = 'Manage your productivity and focus for today.';

  if (currentFilter === 'trash') {
    filteredTasks = sortedTasks.filter(t => t.isDeleted);
    viewTitle = 'Trash';
    viewDesc = 'Deleted tasks. Empty the trash to permanently remove them.';
  } else {
    const activeTasks = sortedTasks.filter(t => !t.isDeleted);
    filteredTasks = activeTasks;

    if (currentFilter === 'today') {
      const targetDate = calendarSelectedDate || getTodayStr();
      filteredTasks = activeTasks.filter(t => t.date === targetDate || t.date === 'Today' || (targetDate === getTodayStr() && t.date < targetDate && !t.completed));
      if (calendarSelectedDate) {
        viewTitle = `Tasks for ${calendarSelectedDate}`;
        viewDesc = `Tasks scheduled for ${calendarSelectedDate}.`;
      } else {
        viewTitle = "Today's Tasks";
        viewDesc = 'Tasks scheduled for today and pending overdue tasks.';
      }
    } else if (currentFilter === 'important') {
      filteredTasks = activeTasks.filter(t => t.important);
      viewTitle = 'Important Tasks';
      viewDesc = 'Your starred tasks.';
    } else if (currentFilter === 'completed') {
      filteredTasks = activeTasks.filter(t => t.completed);
      viewTitle = 'Completed Tasks';
      viewDesc = 'All your completed tasks.';
    } else if (currentFilter.startsWith('category-')) {
      const catId = parseInt(currentFilter.replace('category-', ''), 10);
      filteredTasks = activeTasks.filter(t => t.categoryIds.includes(catId));
      const cat = categories.find(c => c.id === catId);
      viewTitle = cat ? `${cat.label} Tasks` : 'Category Tasks';
      viewDesc = cat ? `Tasks in the ${cat.label} category.` : '';
    }
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative font-sans text-on-surface select-none">
      <Sidebar
        currentFilter={currentFilter}
        onSelectFilter={handleSelectFilter}
        categories={categories}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        onEmptyTrash={handleEmptyTrash}
      />

      <main className="flex-1 ml-[var(--spacing-sidebar-width)] flex flex-col h-full overflow-hidden">
        <Header
          viewMode={viewMode}
          onSwitchView={handleSwitchView}
        />

        <div className="flex-1 overflow-y-auto w-full">
          {loading && (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Loading...
            </div>
          )}
          {!loading && viewMode === 'list' && (
            <Dashboard
              tasks={filteredTasks}
              categories={categories}
              title={viewTitle}
              description={viewDesc}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleImportant={handleToggleImportant}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onEdit={handleEditTask}
              onAddTask={() => handleOpenAddTask()}
            />
          )}
          {!loading && viewMode === 'calendar' && (
            <CalendarView
              tasks={sortedTasks}
              filteredTasks={filteredTasks}
              currentFilter={currentFilter}
              categories={categories}
              onAddTask={handleOpenAddTask}
              onDateSelect={(dateStr) => {
                setCalendarSelectedDate(dateStr);
                setCurrentFilter('today');
                setViewMode('list');
              }}
              onEditTask={handleEditTask}
            />
          )}
        </div>
      </main>

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSave={handleSaveTask}
        categories={categories}
        editingTask={editingTask}
        initialDate={initialDate}
        onAddCategory={handleAddCategory}
      />
    </div>
  );
}

export default App;
