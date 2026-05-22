import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthUser, saveAuthUser, clearAuthUser, getGoogleClientId, saveGoogleClientId } from '../utils/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState('');

  useEffect(() => {
    // Restore session from localStorage
    const stored = getAuthUser();
    if (stored) setUser(stored);
    setGoogleClientId(getGoogleClientId());
    setIsLoading(false);
  }, []);

  // Decode Google JWT credential
  const decodeJwt = (token) => {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch { return null; }
  };

  const signIn = useCallback((credentialResponse) => {
    const payload = decodeJwt(credentialResponse.credential);
    if (!payload) return;
    const userData = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      givenName: payload.given_name,
    };
    saveAuthUser(userData);
    setUser(userData);
  }, []);

  const signOut = useCallback(() => {
    clearAuthUser();
    setUser(null);
    // Revoke Google session
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  const updateClientId = useCallback((id) => {
    saveGoogleClientId(id);
    setGoogleClientId(id);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, googleClientId, updateClientId, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
