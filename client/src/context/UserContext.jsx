import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setLoading(false);
      return;
    }

    api(`/users/${userId}`)
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('userId');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (name, phone) => {
    const data = await api('/users', {
      method: 'POST',
      body: { name, phone },
    });
    localStorage.setItem('userId', data.id);
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('userId');
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}

export default UserContext;
