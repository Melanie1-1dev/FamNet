import React, { createContext, useState, useContext, useCallback } from 'react';
import { db } from '@/api/db';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Sessions live in localStorage, so the signed-in user is known synchronously.
  const [user, setUser] = useState(() => db.auth.getCurrentUser());

  const checkUserAuth = useCallback(async () => {
    setUser(db.auth.getCurrentUser());
  }, []);

  const logout = useCallback(async (shouldRedirect = true) => {
    await db.auth.logout();
    setUser(null);
    if (shouldRedirect) window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoadingAuth: false,
      authChecked: true,
      authError: null,
      logout,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
