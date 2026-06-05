const viteEnv = (import.meta as any).env;
const API_BASE = (
  viteEnv?.VITE_API_BASE_URL ?? (viteEnv?.DEV ? 'http://localhost:5000/api' : '/api')
).replace(/\/$/, '');

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

async function fetchJson(url: string, options?: RequestInit) {
  const method = (options?.method || 'GET').toUpperCase();
  const headers = new Headers(options?.headers || {});
  headers.set('Content-Type', 'application/json');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = readCookie('csrf_token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', decodeURIComponent(csrfToken));
    }
  }

  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getCurrentUser: () =>
    fetchJson(`/auth/me`).then(r => r.data),

  googleLoginUrl: () => `${API_BASE}/auth/google`,

  logout: () =>
    fetchJson(`/auth/logout`, { method: 'POST' }),

  searchUsers: (query: string) =>
    fetchJson(`/users/search?${new URLSearchParams({ q: query }).toString()}`).then(r => r.data),

  getUserAvailability: (userId: number, dueDate: string) =>
    fetchJson(`/users/${userId}/availability?${new URLSearchParams({ dueDate }).toString()}`).then(r => r.data),

  getUserTasks: (userId: number) =>
    fetchJson(`/users/${userId}/tasks`).then(r => r.data),

  getUserCategories: (userId: number) =>
    fetchJson(`/users/${userId}/categories`).then(r => r.data),

  getNotifications: () =>
    fetchJson(`/notifications`).then(r => r.data),

  markNotificationsRead: () =>
    fetchJson(`/notifications/read`, { method: 'PATCH' }).then(r => r.data),

  deleteNotification: (id: number) =>
    fetchJson(`/notifications/${id}`, { method: 'DELETE' }).then(r => r.data),

  clearNotifications: () =>
    fetchJson(`/notifications`, { method: 'DELETE' }).then(r => r.data),

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
    fetchJson(`/tasks/${id}/toggle-complete`, { method: 'PATCH' }),

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
