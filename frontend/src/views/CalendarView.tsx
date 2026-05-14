import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Task, Category } from '../App';

interface CalendarViewProps {
  tasks: Task[];
  filteredTasks: Task[];
  currentFilter: string;
  categories: Category[];
  onAddTask: (date: string) => void;
  onDateSelect?: (date: string) => void;
  onEditTask: (task: Task) => void;
}

export function CalendarView({ tasks, filteredTasks, currentFilter, categories, onAddTask, onDateSelect, onEditTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const weeks = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
    
    let currentWeek: any[] = [];
    const calendarWeeks: any[][] = [];
    
    // Previous month days
    for (let i = 0; i < firstDay; i++) {
        const dateStr = `${currentMonth === 0 ? currentYear - 1 : currentYear}-${String(currentMonth === 0 ? 12 : currentMonth).padStart(2, '0')}-${String(daysInPrevMonth - firstDay + i + 1).padStart(2, '0')}`;
        currentWeek.push({
            date: String(daysInPrevMonth - firstDay + i + 1),
            isCurrentMonth: false,
            isToday: false,
            fullDate: dateStr
        });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        currentWeek.push({
            date: String(i),
            isCurrentMonth: true,
            isToday: i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear(),
            fullDate: dateStr
        });
        
        if (currentWeek.length === 7) {
            calendarWeeks.push(currentWeek);
            currentWeek = [];
        }
    }
    
    // Next month days
    let nextMonthDay = 1;
    while (currentWeek.length < 7 && currentWeek.length > 0) {
        const dateStr = `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String(currentMonth === 11 ? 1 : currentMonth + 2).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
        currentWeek.push({
            date: String(nextMonthDay),
            isCurrentMonth: false,
            isToday: false,
            fullDate: dateStr
        });
        nextMonthDay++;
    }
    if (currentWeek.length > 0) {
      calendarWeeks.push(currentWeek);
    }
    
    // Add extra empty weeks if weeks < 6 to keep grid height consistent
    while(calendarWeeks.length < 6) {
        currentWeek = [];
         for(let i = 0; i < 7; i++) {
             const dateStr = `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String(currentMonth === 11 ? 1 : currentMonth + 2).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
             currentWeek.push({
                 date: String(nextMonthDay),
                 isCurrentMonth: false,
                 isToday: false,
                 fullDate: dateStr
             });
             nextMonthDay++;
         }
         calendarWeeks.push(currentWeek);
    }

    return calendarWeeks;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-200 transition-all text-slate-600 rounded-xl"><ChevronLeft size={24} /></button>
            <h1 className="text-[30px] font-bold text-on-surface min-w-[180px] text-center">{monthNames[currentMonth]} {currentYear}</h1>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-200 transition-all text-slate-600 rounded-xl"><ChevronRight size={24} /></button>
          </div>
          <button onClick={handleToday} className="px-4 py-2 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-all bg-white shadow-sm">
            Today
          </button>
        </div>
        <button 
          onClick={() => onAddTask('')} // empty string will fall back to default
          className="bg-primary hover:bg-primary-container text-white px-5 py-2 rounded-lg text-[14px] font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[600px]">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 shrink-0">
          {daysOfWeek.map(day => (
            <div key={day} className="py-2 text-center text-[12px] font-semibold text-slate-500 tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 grid-rows-6 bg-slate-100 gap-px">
          {weeks.map((week, weekIdx) => (
            <React.Fragment key={weekIdx}>
              {week.map((day, dayIdx) => {
                const dateStr = day.fullDate;
                // Basic matching for tasks. Exact dateStr match, or check if day is today and task date indicates 'Today'
                const dayTasks = tasks.filter(t => !t.isDeleted && (t.date === dateStr || (day.isToday && t.date.includes('Today'))));


                return (
                  <div 
                    key={`${weekIdx}-${dayIdx}`} 
                    className={`p-2 bg-white group hover:bg-slate-50 transition-colors cursor-pointer relative flex flex-col min-h-0 overflow-hidden ${day.isToday ? 'ring-2 ring-primary ring-inset z-[1]' : ''}`}
                    onClick={() => onDateSelect?.(dateStr)}
                    onDoubleClick={(e) => { e.stopPropagation(); onAddTask(dateStr); }}
                  >
                    <div className="shrink-0 mb-1">
                      <span className={`text-[12px] font-medium ${day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'} ${day.isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white' : ''}`}>
                        {day.date}
                      </span>
                    </div>
                    
                    {dayTasks.length > 0 && (
                      <div className="flex-1 overflow-y-auto w-full no-scrollbar space-y-[2px]">
                        {dayTasks.map((task) => {
                          const isMatch = currentFilter === 'all' || filteredTasks.some(ft => ft.id === task.id);
                          const taskClasses = isMatch 
                            ? 'text-slate-900 font-semibold' 
                            : 'text-slate-400 font-normal';
                          
                          const completeClass = task.completed ? 'line-through opacity-60' : '';
                          
                          return (
                            <div 
                              key={task.id} 
                              className={`px-1 py-[2px] ${taskClasses} text-[11px] leading-tight truncate ${completeClass} transition-all hover:bg-slate-100 rounded-sm`}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onEditTask(task);
                              }}
                            >
                              • {task.title}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
