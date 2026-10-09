import {useCallback, useEffect, useState} from 'react';
import {useAppActivity} from '@/components/room/useRoomActivity';
import {nextWelcomeVisit, type WelcomeVisit} from '@/utils/residentWelcome';

let session: WelcomeVisit = {foreground: null, awayAt: 0, serial: 0, pending: 0};
export function useWelcomeVisit() {
  const {active} = useAppActivity();
  const [request, setRequest] = useState(session.pending);
  useEffect(() => {
    session = nextWelcomeVisit(session, active, Date.now());
    setRequest(session.pending);
  }, [active]);
  useEffect(() => () => {session = nextWelcomeVisit(session, false, Date.now());}, []);
  const acknowledge = useCallback((id: number) => {
    if (session.pending !== id) return;
    session = {...session, pending: 0};
    setRequest(0);
  }, []);
  return {request, acknowledge};
}
