import { useEffect, useState } from 'react';
import { getWorldTime } from '@/utils/worldTime';

export function useWorldTime(active: boolean) {
  const [time, setTime] = useState(() => getWorldTime(new Date()));
  useEffect(() => {
    if (!active) return;
    const update = () => setTime(getWorldTime(new Date()));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [active]);
  return time;
}

