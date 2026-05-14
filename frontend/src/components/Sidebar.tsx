import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Inbox, Calendar, Star, Folder, Plus, Settings, Archive, CheckCircle2, Trash2 } from 'lucide-react';
import type { Category } from '../App';

interface SidebarProps {
  currentFilter: string;
  onSelectFilter: (filter: string) => void;
  categories: Category[];
  onAddCategory: (name: string) => Promise<Category | undefined>;
  onRenameCategory: (id: number, newLabel: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onEmptyTrash?: () => Promise<void>;
}

export function Sidebar({ currentFilter, onSelectFilter, categories, onAddCategory, onRenameCategory, onDeleteCategory, onEmptyTrash }: SidebarProps) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('New folder');
  const [renamingCategoryId, setRenamingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; categoryId: number } | null>(null);
  const [trashContextMenu, setTrashContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [categoriesContextMenu, setCategoriesContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingCategory || renamingCategoryId) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isCreatingCategory, renamingCategoryId]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setTrashContextMenu(null);
      setCategoriesContextMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStartCreate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingCategory(true);
    setNewCategoryName('New folder');
  };

  const handleSaveNewCategory = () => {
    if (isCreatingCategory && newCategoryName.trim()) {
      onAddCategory(newCategoryName);
    }
    setIsCreatingCategory(false);
  };

  const handleSaveRename = () => {
    if (renamingCategoryId && editCategoryName.trim()) {
      onRenameCategory(renamingCategoryId, editCategoryName);
    }
    setRenamingCategoryId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, categoryId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, categoryId });
  };

  const handleStartRename = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      setRenamingCategoryId(categoryId);
      setEditCategoryName(cat.label);
    }
    setContextMenu(null);
  };

  const navItems = [
    { id: 'all', icon: Inbox, label: 'All Tasks' },
    { id: 'today', icon: Calendar, label: 'Today' },
    { id: 'important', icon: Star, label: 'Important' },
    { id: 'completed', icon: CheckCircle2, label: 'Completed' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[var(--spacing-sidebar-width)] border-r border-slate-200 bg-slate-50 flex flex-col p-4 gap-2 z-20">
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-md">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-slate-900 leading-tight">My Workspace</h2>
          <p className="text-[11px] text-slate-500 font-medium">Professional Plan</p>
        </div>
      </div>

      <nav 
        className="flex-1 space-y-1 overflow-y-auto"
        onContextMenu={(e) => {
          e.preventDefault();
          setCategoriesContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectFilter(item.id)}
            onContextMenu={(e) => e.stopPropagation()}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 ${
              currentFilter === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <item.icon size={18} />
            <span className="font-medium text-[14px]">{item.label}</span>
          </button>
        ))}

        <div 
          className="pt-6 pb-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center"
          onContextMenu={(e) => e.stopPropagation()}
        >
          <span>Categories</span>
        </div>
        
        {categories.map((cat) => (
          <div key={cat.id} className="relative">
            {renamingCategoryId === cat.id ? (
              <div className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-white border border-primary shadow-sm">
                <Folder size={18} className="text-primary shrink-0" />
                <input
                  ref={inputRef}
                  value={editCategoryName}
                  onChange={e => setEditCategoryName(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') setRenamingCategoryId(null);
                  }}
                  className="w-full bg-transparent border-none focus:outline-none text-[14px] font-medium p-0"
                />
              </div>
            ) : (
              <button
                onClick={() => onSelectFilter(`category-${cat.id}`)}
                onContextMenu={(e) => handleContextMenu(e, cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 ${
                  currentFilter === `category-${cat.id}`
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Folder size={18} className={`shrink-0 ${currentFilter === `category-${cat.id}` ? 'text-primary' : 'text-slate-400'}`} />
                <span className="font-medium text-[14px] truncate flex-1 text-left">{cat.label}</span>
              </button>
            )}
            
            {contextMenu && contextMenu.categoryId === cat.id && (
              <div 
                className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[120px]"
                style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                <button 
                  className="w-full text-left px-4 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(cat.id);
                  }}
                >
                  Rename
                </button>
                <button 
                  className="w-full text-left px-4 py-1.5 text-[13px] text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCategory(cat.id);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {isCreatingCategory && (
          <div className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-white border border-primary shadow-sm mt-1">
            <Folder size={18} className="text-primary shrink-0" />
            <input
              ref={inputRef}
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onBlur={handleSaveNewCategory}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveNewCategory();
                if (e.key === 'Escape') setIsCreatingCategory(false);
              }}
              className="w-full bg-transparent border-none focus:outline-none text-[14px] font-medium p-0"
            />
          </div>
        )}

        {categoriesContextMenu && (
          <div 
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ top: categoriesContextMenu.y, left: categoriesContextMenu.x }}
          >
            <button 
              className="w-full text-left px-4 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreate(e);
                setCategoriesContextMenu(null);
              }}
            >
              <Plus size={14} />
              New Category
            </button>
          </div>
        )}
      </nav>

      <button className="mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-md text-slate-500 hover:text-primary hover:border-primary transition-all text-[14px] font-medium w-full shrink-0" onClick={handleStartCreate}>
        <Plus size={16} />
        New Category
      </button>

      <div className="mt-auto border-t border-slate-200 pt-4 space-y-1">
        <div className="relative">
          <button 
            onClick={() => onSelectFilter('trash')}
            onContextMenu={(e) => {
              e.preventDefault();
              setTrashContextMenu({ x: e.clientX, y: e.clientY });
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 ${
              currentFilter === 'trash'
                ? 'bg-red-50 text-red-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trash2 size={18} />
            <span className="font-medium text-[14px]">Trash</span>
          </button>
          
          {trashContextMenu && (
            <div 
              className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]"
              style={{ top: trashContextMenu.y - 40, left: trashContextMenu.x }}
            >
              <button 
                className="w-full text-left px-4 py-1.5 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onEmptyTrash?.();
                  setTrashContextMenu(null);
                }}
              >
                <Trash2 size={14} />
                Empty Trash
              </button>
            </div>
          )}
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors duration-150">
          <Settings size={18} />
          <span className="font-medium text-[14px]">Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors duration-150">
          <Archive size={18} />
          <span className="font-medium text-[14px]">Archived</span>
        </button>
      </div>
    </aside>
  );
}
