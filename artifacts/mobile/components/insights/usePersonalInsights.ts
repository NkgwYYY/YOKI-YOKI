import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { getTodayDate } from '@/utils/dateUtils';
import { buildPersonalInsights } from '@/utils/personalInsights';

export function usePersonalInsights() {
  const { records, mascotName, progress, isLoading, cloudSynced } = useApp();
  const { user, isSignedIn, isLoading: authLoading } = useAuth();
  const [today, setToday] = useState(getTodayDate);
  useEffect(() => {
    const refresh = () => setToday(getTodayDate());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const ready = !isLoading && !authLoading && (!isSignedIn || cloudSynced);
  const report = useMemo(() => buildPersonalInsights(ready ? records : [], today), [ready, records, today]);
  return { report, ready, owner: user?.id ?? 'guest', mascotName: mascotName || 'よっきー', progress };
}
