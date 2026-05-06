import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('spectra_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('spectra_token', token);
      fetchUser();
    } else {
      localStorage.removeItem('spectra_token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (err) {
      console.error('Auth verification failed', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/auth/login`, formData);
    setToken(response.data.access_token);
    return response.data;
  };

  const signup = async (email, password, name) => {
    const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'}/auth/signup`, {
      email, password, name
    });
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('spectra_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
