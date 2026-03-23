import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const Ctx = createContext(null);

// Set base URL once at module level
axios.defaults.baseURL = API;

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('msai_token') || '');
  const [loading, setLoading] = useState(true);

  const applyToken = (t) => {
    if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    else   delete axios.defaults.headers.common['Authorization'];
  };

  const logout = useCallback(() => {
    localStorage.removeItem('msai_token');
    applyToken(null);
    setToken('');
    setUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await axios.get('/auth/me');
      setUser(data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem('msai_token');
    if (stored) {
      applyToken(stored);
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  // Global 401 interceptor - auto logout on expired token
  useEffect(() => {
    const id = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) logout();
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [logout]);

  const login = async (email, password) => {
    const { data } = await axios.post('/auth/login', { email, password });
    localStorage.setItem('msai_token', data.token);
    applyToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (form) => {
    const { data } = await axios.post('/auth/register', form);
    if (data.token && data.user?.role !== 'doctor') {
      localStorage.setItem('msai_token', data.token);
      applyToken(data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout, updateUser, fetchMe }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
