import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './views/Dashboard';
import { AddTaskModal } from './components/AddTaskModal';
import { CalendarView } from './views/CalendarView';
import { LoginPage } from './components/LoginPage';
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
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const normalizeDate = (dateStr: string) => {
  if (dateStr === 'Today' || dateStr.includes('Today')) return getTodayStr();
  return dateStr;
};

function App() {
  const [currentFilter, setCurrentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialDate, setInitialDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ?��?跨日?��??�新機制
  const initialTodayRef = React.useRef(getTodayStr());
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const currentToday = getTodayStr();
      if (currentToday !== initialTodayRef.current) {
        window.location.reload();
      }
    }, 60000); // 每�??�檢?��?�?    
    return () => clearInterval(checkMidnight);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await api.getCurrentUser();
        setAuthUser(user);
      } catch (err) {
        setAuthUser(null);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const [taskData, catData] = await Promise.all([
          api.getTasks({ filter: 'full' }),
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
  }, [authUser]);

  // 移除?�本每當 filter/search 變�?就�???fetch ??useEffect
  // ?�?�篩?�改?��?�?useMemo ?��?

  const handleOpenAddTask = (date?: string) => {
    setEditingTask(null);
    setInitialDate(date || (currentFilter === 'today' && calendarSelectedDate ? calendarSelectedDate : getTodayStr()));
    setIsAddTaskOpen(true);
  };

  const handleSelectFilter = (filter: string) => {
    setCurrentFilter(filter);
    setCalendarSelectedDate(null);
    if (filter === 'trash') {
      setViewMode('list');
    }
  };

  const handleSwitchView = (mode: 'list' | 'calendar') => {
    if (currentFilter === 'trash') return; // ?�圾桶�??�援?��?模�?
    setViewMode(mode);
    if (mode === 'calendar') {
      setCalendarSelectedDate(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setAuthUser(null);
      setTasks([]);
      setCategories([]);
      setCurrentFilter('all');
      setViewMode('list');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setInitialDate('');
    setIsAddTaskOpen(true);
  };

  const handleSaveTask = async (task: Task) => {
    const isEditing = !!editingTask;
    const oldTasks = [...tasks];

    // Optimistic Update
    if (isEditing) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
    } else {
      // ?��??��?一?�臨??ID
      const tempTask = { ...task, id: Date.now(), completed: false, important: false, isDeleted: false, recurrence: task.recurrence || 'none' };
      setTasks(prev => [...prev, tempTask]);
    }

    try {
      if (isEditing) {
        const updated = await api.updateTask(task.id, {
          title: task.title,
          description: task.description || '',
          date: task.date,
          time: task.time || '',
          estimatedTime: task.estimatedTime || '',
          categoryIds: task.categoryIds,
          priority: task.priority,
          recurrence: task.recurrence || 'none',
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
          recurrence: task.recurrence || 'none',
        });
        // ?��?端�??��??�實?��??��??��??��?
        setTasks(prev => prev.map(t => t.title === created.title && t.date === created.date ? created : t));
      }
    } catch (err) {
      console.error('Failed to save task:', err);
      setTasks(oldTasks); // Rollback
    }
  };

  const handleAddCategory = async (name: string): Promise<Category | undefined> => {
    if (!name || name.trim() === '') return undefined;
    const oldCategories = [...categories];
    const tempId = Date.now();
    const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-purple-500', 'bg-cyan-500'];
    const color = colors[categories.length % colors.length];
    const tempCat = { id: tempId, label: name.trim(), color };

    // Optimistic Update
    setCategories(prev => [...prev, tempCat]);

    try {
      const newCat = await api.createCategory({ label: name.trim(), color });
      setCategories(prev => prev.map(c => c.id === tempId ? newCat : c));
      return newCat;
    } catch (err) {
      console.error('Failed to create category:', err);
      setCategories(oldCategories); // Rollback
      return undefined;
    }
  };

  const handleRenameCategory = async (id: number, newLabel: string) => {
    if (!newLabel || newLabel.trim() === '') return;
    const oldCategories = [...categories];
    // Optimistic Update
    setCategories(prev => prev.map(c => c.id === id ? { ...c, label: newLabel.trim() } : c));

    try {
      const updated = await api.updateCategory(id, { label: newLabel.trim() });
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      console.error('Failed to rename category:', err);
      setCategories(oldCategories); // Rollback
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const oldCategories = [...categories];
    const oldFilter = currentFilter;

    // Optimistic Delete
    setCategories(prev => prev.filter(c => c.id !== id));
    if (currentFilter === `category-${id}`) {
      setCurrentFilter('all');
    }

    try {
      await api.deleteCategory(id);
    } catch (err) {
      console.error('Failed to delete category:', err);
      setCategories(oldCategories); // Rollback
      setCurrentFilter(oldFilter);
    }
  };

  const handleToggleImportant = async (taskId: number) => {
    const oldTasks = [...tasks];
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, important: !t.important } : t));

    try {
      const updated = await api.toggleImportant(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      console.error('Failed to toggle important:', err);
      setTasks(oldTasks); // Rollback
    }
  };

  const handleToggleComplete = async (taskId: number) => {
    const oldTasks = [...tasks];
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));

    try {
      const res = await api.toggleComplete(taskId);
      const updated = res.data;
      const created = res.createdTask;
      
      setTasks(prev => {
        let newTasks = prev.map(t => t.id === taskId ? updated : t);
        if (created) {
          if (!newTasks.some(t => t.id === created.id)) {
            newTasks = [...newTasks, created];
          }
        }
        return newTasks;
      });
    } catch (err) {
      console.error('Failed to toggle complete:', err);
      setTasks(oldTasks); // Rollback
    }
  };

  const handleRestoreTask = async (taskId: number) => {
    const oldTasks = [...tasks];
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isDeleted: false } : t));

    try {
      const updated = await api.restoreTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      console.error('Failed to restore task:', err);
      setTasks(oldTasks); // Rollback
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldTasks = [...tasks];
    
    if (task.isDeleted) {
      // Optimistic Delete from Trash
      setTasks(prev => prev.filter(t => t.id !== taskId));
      try {
        await api.purgeSingleTask(taskId);
      } catch (err) {
        console.error('Failed to permanently delete task:', err);
        setTasks(oldTasks); // Rollback
      }
    } else {
      // Optimistic Move to Trash
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isDeleted: true } : t));
      try {
        const updated = await api.deleteTask(taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      } catch (err) {
        console.error('Failed to delete task:', err);
        setTasks(oldTasks); // Rollback
      }
    }
  };

  const handleEmptyTrash = async () => {
    const oldTasks = [...tasks];
    // Optimistic Empty Trash
    setTasks(prev => prev.filter(t => !t.isDeleted));

    try {
      await api.purgeTasks();
    } catch (err) {
      console.error('Failed to empty trash:', err);
      setTasks(oldTasks); // Rollback
    }
  };

  const processedTasks = useMemo(() => {
    let result = tasks.filter(t => {
      // ?��??��??�濾
      if (searchQuery) {
        const matches = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matches) return false;
      }

      const taskDate = normalizeDate(t.date);
      if (startDate && taskDate < startDate) return false;
      if (endDate && taskDate > endDate) return false;

      return true;
    });

    result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      const priorityOrder: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
    return result;
  }, [tasks, searchQuery, startDate, endDate]);

  const sortedTasks = processedTasks; // ?��?保�?變數?�稱一??
  let filteredTasks = sortedTasks;
  let viewTitle = 'All Tasks';
  let viewDesc = 'Manage your productivity and focus for today.';

  if (currentFilter === 'trash') {
    filteredTasks = sortedTasks.filter(t => t.isDeleted);
    viewTitle = 'Trash';
    viewDesc = 'Deleted tasks. Empty the trash to permanently remove them.';
  } else {
    const activeTasks = sortedTasks.filter(t => !t.isDeleted);
    
    if (currentFilter === 'today') {
      const targetDate = calendarSelectedDate || getTodayStr();
      filteredTasks = activeTasks.filter(t => 
        t.date === targetDate || 
        t.date === 'Today' || 
        (targetDate === getTodayStr() && t.date < targetDate)
      );
      
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
    } else {
      // 'all' view
      filteredTasks = activeTasks;
      viewTitle = 'All Tasks';
      viewDesc = 'Manage your productivity and focus for today.';
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-on-surface-variant">
        Loading...
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage />;
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
          hideCalendarToggle={currentFilter === 'trash'}
          user={authUser}
          onLogout={handleLogout}
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
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              onToggleImportant={handleToggleImportant}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onRestore={handleRestoreTask}
              onEdit={handleEditTask}
              onAddTask={() => handleOpenAddTask()}
              isTrashView={currentFilter === 'trash'}
              isCompletedView={currentFilter === 'completed'}
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
