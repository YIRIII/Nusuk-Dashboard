import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'hadaq_token';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isAdmin, setIsAdmin] = useState<boolean>(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return;
    }
    const API = import.meta.env.VITE_API_URL ?? '';
    fetch(API + '/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
    }).then((r) => {
      if (!r.ok) {
        localStorage.removeItem(TOKEN_KEY);
        setTokenState(null);
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    }).catch(() => {
      setIsAdmin(false);
    });
  }, [token]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const API = import.meta.env.VITE_API_URL ?? '';
    const res = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { token: string };
    localStorage.setItem(TOKEN_KEY, data.token);
    setTokenState(data.token);
    setIsAdmin(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setIsAdmin(false);
  }, []);

  return { token, isAdmin, login, logout };
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
