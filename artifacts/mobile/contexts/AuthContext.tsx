import {ENTRY_CHOICE_KEY,type EntryChoice} from '@/utils/entryRoute';
import {accountDataStore} from '@/utils/accountDataStore';
import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  entryChoice: EntryChoice;
  storageEpoch:number;
  continueAsGuest:()=>Promise<void>;
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
  entryChoice:"guest",
  storageEpoch:0,
  continueAsGuest:async()=>{},
  getToken: async () => null,
  logout: async () => {},
  deleteAccount: async () => {
    throw new Error('このバージョンではアカウント機能を利用できません');
  },
};

/**
 * Unconfigured development builds remain usable locally without an auth service.
 */
export function GuestAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={guestOnlyAuth}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [entryChoice,setEntryChoice]=useState<EntryChoice>(null);
  const [entryReady,setEntryReady]=useState(false),[changing,setChanging]=useState(false);
  const [storageEpoch,setStorageEpoch]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    void AsyncStorage.getItem(ENTRY_CHOICE_KEY).then(saved=>{
      if(!cancelled)setEntryChoice(isSignedIn?'account':saved==='guest'||saved==='account'?saved:null);
    }).finally(()=>{if(!cancelled)setEntryReady(true);}).catch(()=>{});
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{if(isSignedIn){setEntryChoice('account');void AsyncStorage.setItem(ENTRY_CHOICE_KEY,'account').catch(()=>{});}},[isSignedIn]);
  const continueAsGuest=useCallback(async()=>{
    setChanging(true);
    try{
      await accountDataStore.switchOwner('guest');
      await AsyncStorage.setItem(ENTRY_CHOICE_KEY,'guest');
      setEntryChoice('guest');setStorageEpoch(n=>n+1);
    }finally{setChanging(false);}
  },[]);

  const getToken = useCallback(async () => {
    try {
      return await clerkGetToken();
    } catch {
      return null;
    }
  }, [clerkGetToken]);

  const logout = useCallback(async () => {
    setChanging(true);
    try {
      await AsyncStorage.setItem(ENTRY_CHOICE_KEY,'account');
      setEntryChoice('account');
      await signOut();
      await accountDataStore.switchOwner('guest');
      setStorageEpoch(n=>n+1);
    } finally { setChanging(false); }
  }, [signOut]);

  const deleteAccount = useCallback(async () => {
    if (!clerkUser) {
      throw new Error('削除するアカウントが見つかりません');
    }

    const token = await clerkGetToken();
    if (!token) {
      throw new Error('認証を確認できませんでした。もう一度ログインしてください');
    }

    const response = await fetch(`${API_BASE}/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error || '保存データを削除できませんでした');
    }

    await clerkUser.delete();

    await accountDataStore.removeOwner(clerkUser.id);
    await AsyncStorage.setItem(ENTRY_CHOICE_KEY,'account');
    setEntryChoice('account');setStorageEpoch(n=>n+1);

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
        isLoading: !isLoaded || !entryReady || changing,
        entryChoice,storageEpoch,continueAsGuest,
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

