import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudOutboxKey } from '@/utils/cloudOutbox';
import { balanceStorage } from '@/utils/balanceStorage';
import { createCloudSyncTransport } from '@/utils/cloudSync';

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
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const guestOnlyAuth: AuthContextType = {
  isSignedIn: false,
  user: null,
  isLoading: false,
  getToken: async () => null,
  logout: async () => {},
  deleteAccount: async () => {
    throw new Error('このバージョンではアカウント機能を利用できません');
  },
};

/**
 * iOS App Store builds run without Clerk entirely. This provider deliberately
 * ignores any session cached by a previously installed build, so an update
 * cannot resume cloud reads or writes behind the guest-only UI.
 */
export function GuestAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={guestOnlyAuth}>{children}</AuthContext.Provider>;
}

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
      throw new Error('ログアウトできませんでした。通信環境を確認して、もう一度お試しください。');
    }
  }, [signOut]);

  const deletionRef = useRef<Promise<void> | null>(null);
  const deleteAccount = useCallback(() => {
    if (deletionRef.current) return deletionRef.current;
    const run = async () => {
      if (!clerkUser) throw new Error('削除するアカウントが見つかりません');
      const transport = createCloudSyncTransport({ url: `${API_BASE}/account`, getToken: clerkGetToken });
      await transport.deleteAccount(new AbortController().signal);
      const localKeys = await AsyncStorage.getAllKeys();
      const appKeys = localKeys.filter(key => key.startsWith('@mentore/') || key === cloudOutboxKey(clerkUser.id));
      // Keep the identity available for retry if local cleanup fails. The journal
      // must be discarded too, otherwise recovery can restore deleted records.
      await balanceStorage.clearAll(appKeys);
      await clerkUser.delete();
    };
    const pending = run().catch(() => {
      throw new Error('削除を完了できませんでした。通信環境を確認して、もう一度お試しください。');
    }).finally(() => { deletionRef.current = null; });
    deletionRef.current = pending;
    return pending;
  }, [clerkGetToken, clerkUser]);

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
        deleteAccount,
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
