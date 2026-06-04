import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, Timer, X } from 'lucide-react';
import type { AppUser, Availability, Category, Task } from '../App';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editingTask?: Task | null;
  initialDate?: string;
  onSave?: (task: Task) => Promise<boolean> | boolean | void;
  onAddCategory?: (name: string) => Promise<Category | undefined>;
  delegationUser?: AppUser | null;
  delegationAvailability?: Availability | null;
  onDelegationDateChange?: (date: string) => void;
  onNotify: (title: string, message: string) => void;
  onConfirm: (title: string, message: string, confirmText?: string) => Promise<boolean>;
}

export function AddTaskModal({
  isOpen,
  onClose,
  categories,
  editingTask,
  initialDate,
  onSave,
  onAddCategory,
  delegationUser,
  delegationAvailability,
  onDelegationDateChange,
  onNotify,
  onConfirm,
}: AddTaskModalProps) {
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [priority, setPriority] = useState('Low');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const isDelegating = !!delegationUser;

  useEffect(() => {
    if (!isOpen) return;

    setIsCreatingCategory(false);
    setNewCategoryName('');
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setDate(editingTask.date);
      setTime(editingTask.time || '');
      setEstimatedTime(editingTask.estimatedTime ? (parseInt(editingTask.estimatedTime, 10) / 60).toString() : '');
      setSelectedCats(editingTask.categoryIds || []);
      setPriority(editingTask.priority || 'Low');
      setRecurrence(editingTask.recurrence || 'none');
    } else {
      setTitle('');
      setDescription('');
      setDate(initialDate || '');
      setTime('');
      setEstimatedTime('');
      setSelectedCats([]);
      setPriority('Low');
      setRecurrence('none');
    }
  }, [isOpen, editingTask, initialDate]);

  if (!isOpen) return null;

  const handleToggleCategory = (catId: number) => {
    setSelectedCats(prev => (prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDelegating) {
      if (!delegationAvailability) {
        onNotify('工時資料尚未載入', '請稍候再新增需求。');
        return;
      }
      const requestedHours = parseFloat(estimatedTime || '0');
      const originalHours = editingTask?.date === date && editingTask.estimatedTime
        ? parseInt(editingTask.estimatedTime, 10) / 60
        : 0;
      const currentDayHours = Math.max(0, (delegationAvailability?.dayHours ?? 0) - originalHours);
      const totalHours = currentDayHours + requestedHours;

      if (!estimatedTime || requestedHours <= 0) {
        onNotify('缺少工時', '所需花費時間必填。');
        return;
      }

      if (totalHours > 8) {
        onNotify('無法儲存需求', '被需求人當日總工時會超過八小時，無法儲存需求。');
        return;
      }

      if (totalHours >= 6) {
        const confirmed = await onConfirm('工時提醒', '當日總工時已達六小時以上，不一定能完成。仍要儲存需求嗎？', '仍要儲存');
        if (!confirmed) return;
      }
    }

    const saved = await onSave?.({
      id: editingTask ? editingTask.id : 0,
      title,
      description: description || undefined,
      date,
      time: time || undefined,
      estimatedTime: estimatedTime ? (parseFloat(estimatedTime) * 60).toString() : undefined,
      categoryIds: isDelegating ? [] : selectedCats,
      priority,
      completed: editingTask ? editingTask.completed : false,
      important: editingTask ? editingTask.important : false,
      recurrence,
    });

    if (saved === false) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-[24px] font-semibold text-on-surface">{editingTask ? 'Edit Task' : isDelegating ? 'Add Request' : 'Add Task'}</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">
              {isDelegating ? `Requesting work from ${delegationUser?.name || delegationUser?.email}.` : 'Focus on what matters most today.'}
            </p>
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
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (isDelegating) onDelegationDateChange?.(e.target.value);
                  }}
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
              <label htmlFor="estimated-time" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Est. Time (Hours)</label>
              <div className="relative">
                <input
                  id="estimated-time"
                  type="number"
                  min={isDelegating ? '0.5' : '0'}
                  step="0.5"
                  placeholder="e.g. 1.5"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-[14px]"
                  required={isDelegating}
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
            <label htmlFor="recurrence" className="text-[12px] font-semibold tracking-wider text-on-surface-variant block uppercase">Repeat</label>
            <select id="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as any)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-[14px]">
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {isDelegating && delegationAvailability && (
            <div className="grid grid-cols-3 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-[12px]">
              <div>
                <span className="block text-slate-500 font-semibold">常規工作</span>
                <span className="block text-[18px] font-bold text-slate-900">{delegationAvailability.regularWork}</span>
              </div>
              <div>
                <span className="block text-slate-500 font-semibold">他人委託</span>
                <span className="block text-[18px] font-bold text-slate-900">{delegationAvailability.otherRequests}</span>
              </div>
              <div>
                <span className="block text-slate-500 font-semibold">當日已佔用</span>
                <span className="block text-[18px] font-bold text-slate-900">{delegationAvailability.dayHours}h</span>
              </div>
            </div>
          )}

          {!isDelegating && (
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
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 font-semibold text-[14px] hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl font-semibold text-[14px] hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              {editingTask ? 'Save Changes' : isDelegating ? 'Send Request' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
