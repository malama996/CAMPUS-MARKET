"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';
import api from './api';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check active sessions and sets the user
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await api.post('/auth/login', { email, password });
    if (error) throw new Error(error);

    if (data?.access_token && data?.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) throw sessionError;
    }

    if (data?.profile) {
      setProfile(data.profile);
    }

    return data;
  };

  const register = async (payload) => {
    const { data, error } = await api.post('/auth/register', payload);
    if (error) throw new Error(error);

    // Registration only — no auto-login. User is redirected to /login to sign in manually.
    return data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/');
  };

  const deleteAccount = async () => {
    const { error } = await api.delete('/auth/me');
    if (error) throw new Error(error);

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, deleteAccount, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);