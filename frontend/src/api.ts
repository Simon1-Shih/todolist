const API_BASE = 'http://localhost:5000/api';

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Tasks
  getTasks: (params?: Record<string, string>) =>
    fetchJson(`/tasks?${new URLSearchParams(params || {}).toString()}`).then(r => r.data),

  getTask: (id: number) =>
    fetchJson(`/tasks/${id}`).then(r => r.data),

  createTask: (task: Record<string, any>) =>
    fetchJson(`/tasks`, { method: 'POST', body: JSON.stringify(task) }).then(r => r.data),

  updateTask: (id: number, task: Record<string, any>) =>
    fetchJson(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }).then(r => r.data),

  toggleComplete: (id: number) =>
    fetchJson(`/tasks/${id}/toggle-complete`, { method: 'PATCH' }).then(r => r.data),

  toggleImportant: (id: number) =>
    fetchJson(`/tasks/${id}/toggle-important`, { method: 'PATCH' }).then(r => r.data),
  restoreTask: (id: number) =>
    fetchJson(`/tasks/${id}/restore`, { method: 'PATCH' }).then(r => r.data),

  deleteTask: (id: number) =>
    fetchJson(`/tasks/${id}`, { method: 'DELETE' }).then(r => r.data),

  purgeTasks: () =>
    fetchJson(`/tasks/purge`, { method: 'DELETE' }).then(r => r.data),
  purgeSingleTask: (id: number) =>
    fetchJson(`/tasks/${id}/purge`, { method: 'DELETE' }).then(r => r.data),

  // Categories
  getCategories: () =>
    fetchJson(`/categories`).then(r => r.data),

  createCategory: (data: Record<string, any>) =>
    fetchJson(`/categories`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.data),

  updateCategory: (id: number, data: Record<string, any>) =>
    fetchJson(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.data),

  deleteCategory: (id: number) =>
    fetchJson(`/categories/${id}`, { method: 'DELETE' }).then(r => r.data),
};
