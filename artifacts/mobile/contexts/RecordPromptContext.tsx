import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {useApp} from './AppContext';
import {PRIVATE_CACHE_KEYS, type PrivateCache} from '@/utils/privateCache';
import {DEFAULT_RECORD_PROMPT, parseRecordPrompt, type RecordPrompt} from '@/utils/recordPrompt';

type Value = {settings: RecordPrompt; ready: boolean; busy: boolean; error: string; now: Date;
  save: (next: RecordPrompt) => Promise<boolean>; retry: () => void};
const Context = createContext<Value | null>(null);
export function RecordPromptProvider({children}: {children: React.ReactNode}) {
  const {privateCache} = useApp();
  const [saved,setSaved] = useState<{scope: PrivateCache; settings: RecordPrompt} | null>(null);
  const [failure,setFailure] = useState<{scope: PrivateCache; message: string} | null>(null);
  const [busy,setBusy] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const [now,setNow] = useState(() => new Date());
  const saving = useRef(false);
  const ready = !!privateCache && saved?.scope === privateCache && privateCache.isCurrent();
  useEffect(() => {
    if (!privateCache) return;
    let alive = true;
    privateCache.getItem(PRIVATE_CACHE_KEYS.RECORD_PROMPT).then(raw => {
      const settings = parseRecordPrompt(raw);
      if (alive && privateCache.isCurrent()) {setSaved({scope:privateCache,settings});setFailure(null);}
    }).catch(() => {if (alive && privateCache.isCurrent()) setFailure({scope:privateCache,message:'記録の時間を読み込めませんでした。再読み込みをお試しください。'});});
    return () => {alive=false;};
  }, [privateCache,attempt]);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {setNow(new Date());};
    const schedule = (state: string) => {
      clearInterval(timer); timer=undefined;
      if (state === 'active') {refresh(); timer=setInterval(refresh,15000);}
    };
    schedule(AppState.currentState);
    const sub=AppState.addEventListener('change',schedule);
    return () => {clearInterval(timer);sub.remove();};
  }, []);
  const save=useCallback(async(next: RecordPrompt) => {
    if (!ready || !privateCache || saving.current) return false;
    saving.current=true;setBusy(true);setFailure(null);
    try {
      const settings=parseRecordPrompt(JSON.stringify(next));
      await privateCache.setItem(PRIVATE_CACHE_KEYS.RECORD_PROMPT,JSON.stringify(settings));
      if (!privateCache.isCurrent()) return false;
      setSaved({scope:privateCache,settings});setNow(new Date());return true;
    } catch {
      if (privateCache.isCurrent()) setFailure({scope:privateCache,message:'保存できませんでした。設定は変更されていません。もう一度お試しください。'});
      return false;
    } finally {saving.current=false;setBusy(false);}
  }, [privateCache,ready]);
  return <Context.Provider value={{settings:ready?saved!.settings:DEFAULT_RECORD_PROMPT,ready,busy,
    error:failure?.scope===privateCache?failure.message:'',now,save,retry:()=>setAttempt(n=>n+1)}}>{children}</Context.Provider>;
}
export function useRecordPrompt() {const value=useContext(Context);if(!value)throw new Error('RecordPromptProvider missing');return value;}
