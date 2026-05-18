import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tf_token');
    if (token) {
      apiFetch('/auth/me')
        .then(d => setUser(d.user))
        .catch(() => localStorage.removeItem('tf_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('tf_token', data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await apiFetch('/auth/signup', { method: 'POST', body: { name, email, password } });
    localStorage.setItem('tf_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('tf_token');
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
