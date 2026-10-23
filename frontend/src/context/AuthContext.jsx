import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../lib/api';

/**
 * React context provider for AuthContext.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const AuthContext = createContext(null);

/** Returns true if the profile is considered "empty" and needs setup. */
export function isProfileIncomplete(user) {
  return !user?.full_name || user.full_name.trim() === '';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }

    api.auth
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));

    const handleUnauthorized = () => {
      setUser(null);
      tokenStore.clear();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const requestOtp = useCallback((email) => api.auth.requestOtp(email), []);

  const loginWithPassword = useCallback(async (email, password) => {
    const { token, user: me } = await api.auth.login(email, password);
    tokenStore.set(token);
    setUser(me);
    return { isNewUser: isProfileIncomplete(me) };
  }, []);

  const register = useCallback(async (email, password, code, rollNumber) => {
    const { token, user: me } = await api.auth.register(email, password, code, rollNumber);
    tokenStore.set(token);
    setUser(me);
  }, []);

  const resetPassword = useCallback(async (email, code, password) => {
    const { token, user: me } = await api.auth.resetPassword(email, code, password);
    tokenStore.set(token);
    setUser(me);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      requestOtp,
      loginWithPassword,
      register,
      resetPassword,
      signOut,
    }),
    [user, loading, requestOtp, loginWithPassword, register, resetPassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
