import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useUser, useSession } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudOutboxKey } from '@/utils/cloudOutbox';
import { balanceStorage } from '@/utils/balanceStorage';
import { createCloudSyncTransport } from '@/utils/cloudSync';
import { accountCacheKey } from '@/utils/accountOwnership';
import { notifyAccountDeletion } from '@/utils/accountDeletion';

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
  const { isLoaded, isSignedIn, userId, sessionId, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { session: clerkSession } = useSession();
  const isLoading = !isLoaded || isSignedIn === undefined || (!!isSignedIn && (
    !userId || !sessionId || clerkUser?.id !== userId || clerkSession?.id !== sessionId || clerkSession?.user.id !== userId
  ));
  const sessionKey = !isLoading && isSignedIn ? JSON.stringify([userId, sessionId]) : null;
  const scopeRef = useRef({ key: sessionKey });
  // A new object invalidates old operations even for A -> loading -> A.
  if (scopeRef.current.key !== sessionKey) scopeRef.current = { key: sessionKey };
  const scope = scopeRef.current;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const isCurrent = useCallback(() => mounted.current && scope.key !== null && scopeRef.current === scope
    && clerkSession?.id === sessionId && clerkSession?.user.id === userId,
  [scope, clerkSession, sessionId, userId]);

  const getToken = useCallback(async () => {
    try {
      if (!isCurrent() || !clerkSession) return null;
      // useAuth().getToken reads the SDK's global active session at call time.
      // Use the captured resource so an SDK switch before React renders cannot
      // send this account's snapshot with the next account's credentials.
      const token = await clerkSession.getToken();
      return isCurrent() ? token : null;
    } catch {
      return null;
    }
  }, [clerkSession, isCurrent]);

  const logout = useCallback(async () => {
    try {
      if (!isCurrent() || !sessionId) throw new Error('Session changed');
      await signOut({ sessionId });
    } catch {
      throw new Error('ログアウトできませんでした。通信環境を確認して、もう一度お試しください。');
    }
  }, [signOut, sessionId, isCurrent]);

  const deletionRef = useRef<{ scope: typeof scope; promise: Promise<void> } | null>(null);
  const deleteAccount = useCallback(() => {
    if (!isCurrent()) return Promise.reject(new Error('アカウントの切り替え中です。もう一度お試しください。'));
    if (deletionRef.current) return deletionRef.current.scope === scope
      ? deletionRef.current.promise
      : Promise.reject(new Error('前のアカウントの処理中です。少し待って、もう一度お試しください。'));
    const run = async () => {
      if (!clerkUser) throw new Error('削除するアカウントが見つかりません');
      let serverDeleted = false;
      notifyAccountDeletion({ accountId: clerkUser.id, phase: 'start' });
      try {
        const transport = createCloudSyncTransport({ url: `${API_BASE}/account`, getToken });
        await transport.deleteAccount(new AbortController().signal);
        serverDeleted = true;
        if (!isCurrent()) throw new Error('Session changed');
        const localKeys = await AsyncStorage.getAllKeys();
        const appKeys = localKeys.filter(key => key.startsWith('@mentore/') || key === cloudOutboxKey(clerkUser.id) || key === accountCacheKey(clerkUser.id));
        // Keep the identity available for retry if local cleanup fails. The journal
        // must be discarded too, otherwise recovery can restore deleted records.
        await balanceStorage.clearAll(appKeys, isCurrent);
        if (!isCurrent()) throw new Error('Session changed');
        await clerkUser.delete();
      } finally {
        notifyAccountDeletion({ accountId: clerkUser.id, phase: 'finish', serverDeleted });
      }
    };
    const pending = run().catch(() => {
      throw new Error('削除を完了できませんでした。通信環境を確認して、もう一度お試しください。');
    }).finally(() => { deletionRef.current = null; });
    deletionRef.current = { scope, promise: pending };
    return pending;
  }, [getToken, clerkUser, isCurrent, scope]);

  const user: AuthUser | null = !isLoading && isSignedIn && clerkUser
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
        isLoading,
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
