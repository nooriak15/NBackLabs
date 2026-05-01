import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Real Supabase-backed auth.
 *
 * - On mount, we read the current session and subscribe to onAuthStateChange.
 * - `signIn`/`signUp`/`logout` are exposed for the Login page and AppLayout.
 * - `isLoadingAuth` is true on first paint (until Supabase has reported the
 *   initial session) so protected routes don't bounce to /login on refresh.
 *
 * Researchers authenticate; participants don't (the /play/:code/:subject
 * route is public and uses the anon role with RLS read access).
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Initial session lookup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    // Subscribe to login / logout / token-refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError({ type: 'sign_in_failed', message: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };

  const signUp = async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError({ type: 'sign_up_failed', message: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Legacy fields kept so existing components that read them don't crash.
  const value = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    appPublicSettings: null,
    signIn,
    signUp,
    logout,
    navigateToLogin: () => {
      if (typeof window !== 'undefined') window.location.href = '/login';
    },
    checkAppState: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
