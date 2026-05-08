import { fetchAPI, setAuthToken } from './config';

/**
 * Servicio de Autenticación
 */
export const AuthAPI = {
  login: async (email, password) => {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.access_token);
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
    setAuthToken(null);
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
