import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './views/Dashboard';
import { AddTaskModal } from './components/AddTaskModal';
import { CalendarView } from './views/CalendarView';

export interface Category {
  id: string;
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
  categoryIds: string[];
  priority: string;
  completed: boolean;
  important: boolean;
  isDeleted?: boolean;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
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

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      setTasks(tasks.map(t => t.id === task.id ? task : t));
    } else {
      setTasks([...tasks, { ...task, id: Math.max(0, ...tasks.map(t => t.id)) + 1 }]);
    }
  };

  const [categories, setCategories] = useState<Category[]>([
    { id: 'urgent', label: 'Urgent', color: 'bg-red-500' },
    { id: 'important', label: 'Important', color: 'bg-amber-500' },
    { id: 'routine', label: 'Routine', color: 'bg-blue-500' },
  ]);

  const handleAddCategory = (name: string) => {
    if (name && name.trim() !== "") {
      const id = name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      
      const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-purple-500', 'bg-cyan-500'];
      const color = colors[categories.length % colors.length];
      
      const newCategory = { id, label: name.trim(), color };
      setCategories([...categories, newCategory]);
      return newCategory;
    }
    return undefined;
  };

  const handleRenameCategory = (id: string, newLabel: string) => {
    if (newLabel && newLabel.trim() !== "") {
      setCategories(categories.map(c => c.id === id ? { ...c, label: newLabel.trim() } : c));
    }
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    if (currentFilter === `category-${id}`) {
      setCurrentFilter('all');
    }
  };

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: 'Review Quarterly Marketing Strategy',
      date: getTodayStr(),
      time: '14:00',
      estimatedTime: '60',
      categoryIds: ['urgent'],
      priority: 'High',
      completed: false,
      important: true,
    },
    {
      id: 2,
      title: 'Grocery Shopping',
      date: getTodayStr(),
      time: '18:00',
      estimatedTime: '45',
      categoryIds: ['routine'],
      priority: 'Medium',
      completed: false,
      important: false,
    },
    {
      id: 3,
      title: 'Send Invoice to Client X',
      date: getTodayStr(),
      time: '09:00',
      estimatedTime: '15',
      categoryIds: ['urgent'],
      priority: 'High',
      completed: true,
      important: false,
    },
    {
      id: 4,
      title: 'Prepare Slide Deck for Board Meeting',
      date: getTomorrowStr(),
      time: '10:00',
      estimatedTime: '120',
      categoryIds: ['important'],
      priority: 'High',
      completed: false,
      important: true,
    }
  ]);

  const handleToggleImportant = (taskId: number) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, important: !t.important } : t));
  };

  const handleToggleComplete = (taskId: number) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.isDeleted) {
      // Hard delete from trash
      setTasks(tasks.filter(t => t.id !== taskId));
    } else {
      // Soft delete to trash
      setTasks(tasks.map(t => t.id === taskId ? { ...t, isDeleted: true } : t));
    }
  };

  const handleEmptyTrash = () => {
    setTasks(tasks.filter(t => !t.isDeleted));
  };

  const sortedTasks = useMemo(() => {
    let result = [...tasks];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(lowerQuery));
    }

    result.sort((a, b) => {
      // 1. Sort by date
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      
      // 2. Sort by time (treat undefined as late or early) Let's treat undefined as earlier
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }

      // 3. Sort by priority
      const priorityOrder: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 };
      const pA = priorityOrder[a.priority] || 3;
      const pB = priorityOrder[b.priority] || 3;
      return pA - pB;
    });

    return result;
  }, [tasks, searchQuery]);

  let filteredTasks = sortedTasks;
  let viewTitle = 'All Tasks';
  let viewDesc = 'Manage your productivity and focus for today.';

  if (currentFilter === 'trash') {
    filteredTasks = sortedTasks.filter(t => t.isDeleted);
    viewTitle = 'Trash';
    viewDesc = 'Deleted tasks. Empty the trash to permanently remove them.';
  } else {
    // Hide deleted tasks from all other views
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
      const catId = currentFilter.replace('category-', '');
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
          {viewMode === 'list' && (
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
          {viewMode === 'calendar' && (
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
