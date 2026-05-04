import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthAPI } from '../api/auth';
import { API_URL } from '../api/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [apiConnected, setApiConnected] = useState(true);

  useEffect(() => {
    checkAPIAndLoadSession();
  }, []);

  const checkAPIAndLoadSession = async () => {
    try {
      // Check if API is reachable
      const healthCheck = await fetch(`${API_URL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      setApiConnected(healthCheck.ok);
      
      if (healthCheck.ok) {
        await loadSession();
      } else {
        setApiError('El servidor no responde correctamente');
      }
    } catch (err) {
      console.error('API connection error:', err);
      setApiConnected(false);
      setApiError('No se puede conectar al servidor. Verifica que el backend esté corriendo.');
    }
    setLoading(false);
  };

  const loadSession = async () => {
    try {
      const token = AuthAPI.getToken();
      if (token) {
        const user = await AuthAPI.getMe();
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          AuthAPI.logout();
        }
      }
    } catch (err) {
      console.error('Error loading session:', err);
      AuthAPI.logout();
    }
  };

  const login = async (email, password) => {
    try {
      setApiError(null);
      const data = await AuthAPI.login(email, password);
      setCurrentUser(data.user);
      setApiConnected(true);
      return { success: true };
    } catch (error) {
      setApiError(error.message);
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        setApiConnected(false);
      }
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      setApiError(null);
      const user = await AuthAPI.register(userData);
      return { success: true, user };
    } catch (error) {
      setApiError(error.message);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    AuthAPI.logout();
    setCurrentUser(null);
    setApiError(null);
  };

  const updateUser = async (userData) => {
    try {
      const updated = await AuthAPI.updateMe(userData);
      setCurrentUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const retryConnection = async () => {
    setLoading(true);
    await checkAPIAndLoadSession();
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      apiError,
      apiConnected,
      login, 
      register, 
      logout, 
      updateUser,
      retryConnection,
      isAuthenticated: AuthAPI.isAuthenticated,
      isAdmin: AuthAPI.isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
