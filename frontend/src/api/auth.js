import { fetchAPI } from './config.js';

/**
 * Servicio de Autenticación
 */
export const AuthAPI = {
  login: async (email, password) => {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  register: async (userData) => {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getMe: () => fetchAPI('/auth/me'),

  updateMe: (data) => fetchAPI('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  changePassword: (oldPassword, newPassword) => fetchAPI('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  }),

  getToken: () => localStorage.getItem('token'),
  
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => !!localStorage.getItem('token'),
  
  isAdmin: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.rol === 'admin';
  }
};

/**
 * Servicio de Usuarios (Admin)
 */
export const UsersAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/auth/users?${query}`);
  },

  get: (id) => fetchAPI(`/auth/users/${id}`),

  create: (data) => fetchAPI('/auth/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/auth/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/auth/users/${id}`, { method: 'DELETE' }),
};
