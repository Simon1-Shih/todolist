import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Timer } from 'lucide-react';
import type { Category, Task } from '../App';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editingTask?: Task | null;
  initialDate?: string;
  onSave?: (task: Task) => void;
}

export function AddTaskModal({ isOpen, onClose, categories, editingTask, initialDate, onSave, onAddCategory }: AddTaskModalProps & { onAddCategory?: (name: string) => Promise<Category | undefined> }) {
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [priority, setPriority] = useState('Low');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsCreatingCategory(false);
      setNewCategoryName('');
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setDate(editingTask.date);
        setTime(editingTask.time || '');
        setEstimatedTime(editingTask.estimatedTime || '');
        setSelectedCats(editingTask.categoryIds || []);
        setPriority(editingTask.priority || 'Low');
      } else {
        setTitle('');
        setDescription('');
        setDate(initialDate || '');
        setTime('');
        setEstimatedTime('');
        setSelectedCats([]);
        setPriority('Low');
      }
    }
  }, [isOpen, editingTask, initialDate]);

  if (!isOpen) return null;

  const handleToggleCategory = (catId: number) => {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleCreateCategory = async (e: React.KeyboardEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if ('key' in e) e.preventDefault();

    if (newCategoryName.trim() && onAddCategory) {
      const newCat = await onAddCategory(newCategoryName.trim());
      if (newCat) {
        setSelectedCats(prev => [...prev, newCat.id]);
      }
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        id: editingTask ? editingTask.id : 0,
        title,
        description: description || undefined,
        date,
        time: time || undefined,
        estimatedTime: estimatedTime || undefined,
        categoryIds: selectedCats,
        priority,
        completed: editingTask ? editingTask.completed : false,
        important: editingTask ? editingTask.important : false,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-[24px] font-semibold text-on-surface">{editingTask ? 'Edit Task' : 'Add Task'}</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">Focus on what matters most today.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
            <X size={24} />
          </button>
        </div>

        <form className="px-8 pb-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="task-title" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Task Title</label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design System Review"
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-[16px]"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="task-desc" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Description (Optional)</label>
              <textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this task..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-[14px] resize-none min-h-[80px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="due-date" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Due Date</label>
              <div className="relative">
                <input
                  id="due-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-[14px]"
                  required
                />
                <CalendarIcon size={16} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="due-time" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Time (Optional)</label>
              <div className="relative">
                <input
                  id="due-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-[14px]"
                />
                <Clock size={16} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="estimated-time" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Est. Time (Mins)</label>
              <div className="relative">
                <input
                  id="estimated-time"
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-[14px]"
                />
                <Timer size={16} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Priority</label>
              <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-[14px]">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Category</label>
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all shadow-sm ${
                    selectedCats.includes(cat.id)
                      ? 'bg-primary text-white'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {cat.label}
                </button>
              ))}

              {isCreatingCategory ? (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleCreateCategory}
                  onBlur={handleCreateCategory}
                  className="px-4 py-2 rounded-full text-[12px] bg-white border border-slate-200 focus:outline-none focus:border-primary shadow-sm w-[120px]"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="px-4 py-2 rounded-full text-[12px] font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 flex items-center gap-1 shadow-sm"
                >
                  + Category
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 font-semibold text-[14px] hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl font-semibold text-[14px] hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              {editingTask ? 'Save Changes' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
