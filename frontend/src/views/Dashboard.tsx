import React, { useState } from 'react';
import { Search, Calendar as CalendarIcon, Edit2, Trash2, CheckCircle2, Star, Clock, Plus, RotateCcw, Filter, X, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import type { Task, Category } from '../App';

interface DashboardProps {
  tasks: Task[];
  categories: Category[];
  title: string;
  description: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onToggleImportant: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  onEdit: (task: Task) => void;
  onAddTask: () => void;
  isTrashView?: boolean;
  isCompletedView?: boolean;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
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

export function Dashboard({ tasks, categories, title, description, searchQuery = "", onSearchChange, onToggleImportant, onToggleComplete, onDelete, onRestore, onEdit, onAddTask, isTrashView, isCompletedView, startDate, onStartDateChange, endDate, onEndDateChange }: DashboardProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const visibleTasks = tasks.filter(t => {
    if (isCompletedView || isTrashView) return true;
    if (t.completed && t.date < getTodayStr()) return false;
    return true;
  });

  const completedCount = visibleTasks.filter(t => t.completed).length;

  const formatTaskDate = (task: Task) => {
    let dateStr = task.date;
    if (task.date === getTodayStr()) dateStr = 'Today';
    else if (task.date === getTomorrowStr()) dateStr = 'Tomorrow';

    if (task.time) {
      dateStr += `, ${task.time}`;
    }
    return dateStr;
  };

  const isOverdue = (task: Task) => {
    return !task.completed && task.date < getTodayStr();
  };

  return (
    <div className="p-10 max-w-5xl mx-auto w-full flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[30px] font-bold text-on-background mb-1">{title}</h1>
          <p className="text-[14px] text-on-surface-variant">{description}</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search tasks, labels, or dates..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm text-[16px]"
                />
              </div>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${isFilterOpen || startDate || endDate ? 'bg-primary text-white border-primary shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50 hover:text-primary'}`}
                title="Filter by date range"
              >
                <Filter size={20} />
                {(startDate || endDate) && <span className="text-[12px] font-bold underline">Active</span>}
              </button>
            </div>
            {!isTrashView && (
              <button 
                onClick={onAddTask}
                className="bg-primary hover:bg-primary-container text-white px-5 py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Plus size={18} />
                Add Task
              </button>
            )}
          </div>

          <motion.div 
            initial={false}
            animate={{ height: isFilterOpen ? 'auto' : 0, opacity: isFilterOpen ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Start Date</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">End Date</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { onStartDateChange(''); onEndDateChange(''); }}
                  className="ml-auto px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[13px] font-bold hover:bg-red-100 flex items-center gap-2 transition-all border border-red-100"
                >
                  <X size={16} /> Reset Dates
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="space-y-4">
        {visibleTasks.map(task => {
          const primaryCategory = task.categoryIds && task.categoryIds.length > 0 ? categories.find(c => c.id === task.categoryIds[0]) : undefined;
          const bgStripColor = primaryCategory ? primaryCategory.color : 'bg-primary';

          return (
            <motion.div 
              key={task.id} 
              initial="rest"
              whileHover="hover"
              animate="rest"
              className={`task-card group relative p-4 rounded-xl shadow-sm border transition-all flex items-center gap-4 hover:border-primary/20 bg-white ${task.completed ? 'opacity-70 bg-slate-50 border-slate-100' : 'border-slate-100 hover:shadow-md'}`}
            >
              {!task.completed && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${bgStripColor} rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
              )}
              
              <div className="flex-shrink-0">
                {!isTrashView && (
                  task.completed ? (
                    <button onClick={() => onToggleComplete(task.id)} className="focus:outline-none">
                      <CheckCircle2 size={24} className="text-primary fill-primary/20" />
                    </button>
                  ) : (
                    <input 
                      type="checkbox" 
                      checked={task.completed}
                      onChange={() => onToggleComplete(task.id)}
                      className="w-6 h-6 rounded-full border-2 border-slate-300 text-primary focus:ring-primary cursor-pointer transition-all aspect-square"
                    />
                  )
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`font-semibold text-[16px] ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <motion.div 
                    variants={{
                      rest: { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 },
                      hover: { height: "auto", opacity: 1, marginTop: 4, marginBottom: 4 }
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className={`text-[13px] line-clamp-3 ${task.completed ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
                      {task.description}
                    </p>
                  </motion.div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className={`flex items-center gap-1 text-[12px] font-medium ${task.completed ? 'text-slate-400' : isOverdue(task) ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                    {task.completed ? <CheckCircle2 size={14} /> : <CalendarIcon size={14} />}
                    {formatTaskDate(task)}
                  </span>
                  
                  {task.estimatedTime && (
                    <span className={`flex items-center gap-1 text-[12px] font-medium ${task.completed ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Clock size={12} />
                      {parseInt(task.estimatedTime) / 60}h
                    </span>
                  )}

                  {task.categoryIds && task.categoryIds.map(catId => {
                    const cat = categories.find(c => c.id === catId);
                    if (!cat) return null;
                    return (
                      <span key={cat.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.completed ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>
                        {cat.label}
                      </span>
                    );
                  })}
                  
                  {task.priority && !task.completed && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.priority === 'High' ? 'bg-red-50 text-red-600' : task.priority === 'Medium' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      {task.priority}
                    </span>
                  )}

                  {task.recurrence && task.recurrence !== 'none' && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                      task.completed 
                        ? 'bg-slate-100 text-slate-400' 
                        : 'bg-purple-50 text-purple-600 border border-purple-100/50'
                    }`} title={`Repeats ${task.recurrence}`}>
                      <Repeat size={10} className={task.completed ? 'text-slate-400' : 'text-purple-500'} />
                      {task.recurrence}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                {isTrashView ? (
                  <>
                    <button 
                      onClick={() => onRestore?.(task.id)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                      title="Restore"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(task.id)}
                      className="p-2 text-slate-400 hover:text-error hover:bg-error-container rounded-lg transition-all"
                      title="Delete Permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => onEdit(task)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(task.id)}
                      className="p-2 text-slate-400 hover:text-error hover:bg-error-container rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>

              {!isTrashView && (
                <div className="flex items-center ml-2 border-l border-slate-100 pl-4">
                  <button 
                    onClick={() => onToggleImportant(task.id)}
                    className={`p-2 rounded-xl transition-all ${
                      task.important 
                        ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' 
                        : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
                    }`}
                    aria-label="Toggle importance"
                  >
                    <Star fill={task.important ? 'currentColor' : 'none'} size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {!isTrashView && !isCompletedView && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-surface-container-low border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
            <h4 className="text-[14px] font-medium text-on-surface-variant mb-4">Pending by Priority</h4>
            <div className="flex gap-4">
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center border border-red-100/50">
                <span className="block text-[12px] font-bold text-red-600 uppercase tracking-wider mb-1">High</span>
                <span className="block text-[24px] font-bold text-red-700">{tasks.filter(t => !t.completed && t.priority === 'High').length}</span>
              </div>
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center border border-blue-100/50">
                <span className="block text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-1">Medium</span>
                <span className="block text-[24px] font-bold text-blue-700">{tasks.filter(t => !t.completed && t.priority === 'Medium').length}</span>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100/50">
                <span className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Low</span>
                <span className="block text-[24px] font-bold text-slate-700">{tasks.filter(t => !t.completed && t.priority === 'Low').length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-low border border-slate-100 p-6 rounded-2xl shadow-xl flex flex-col justify-center">
            <h4 className="text-[14px] font-medium text-on-surface-variant">Total Tasks</h4>
            <p className="text-[40px] font-bold text-on-surface mt-1">{visibleTasks.length}</p>
            <p className="text-[14px] text-emerald-600 font-bold mt-1">{completedCount} Completed</p>
          </div>
        </div>
      )}
    </div>
  );
}
