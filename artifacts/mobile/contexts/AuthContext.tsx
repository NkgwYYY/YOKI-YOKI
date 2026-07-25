import React, { createContext, useContext, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/expo';

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  /** true when a user session is active */
  isSignedIn: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  /** Returns a fresh Clerk session token for Authorization: Bearer */
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const getToken = useCallback(async () => {
    try {
      return await clerkGetToken();
    } catch {
      return null;
    }
  }, [clerkGetToken]);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
  }, [signOut]);

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        user,
        isLoading: !isLoaded,
        getToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
