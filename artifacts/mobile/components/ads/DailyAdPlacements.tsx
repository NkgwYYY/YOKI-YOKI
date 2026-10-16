import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BANNER_HEIGHT, BANNER_RAIL_HEIGHT, BANNER_WIDTH, DISCONNECTED_DAILY_ADS,
  createDailyRewardGate, dailyAdPresentation, dailyAdResultMessage,
  type DailyAdEnvironment, type DailyAdPlacement, type DailyRewardBinding,
} from '../../utils/dailyAdPlacements';

export interface DailyAdBinding extends DailyRewardBinding {
  /** Subscribe to the existing shared ad store; getSnapshot must be referentially stable. */
  subscribe(listener: () => void): () => void;
  /** Render the real SDK banner at this exact size. No mock/test creatives in production.
   * On no-fill/error the shared store must set bannerAvailable=false. */
  renderBanner(options: {placement: 'home' | 'street'; width: number; height: number}): React.ReactNode;
}

const AdContext = createContext<DailyAdBinding | null>(null);
const rewardGate = createDailyRewardGate();
const subscribeNothing = (_listener: () => void) => () => {};
const getDisconnectedSnapshot = () => DISCONNECTED_DAILY_ADS;

/** Connect ONCE to the current ad service, never create one service per placement.
 * Without a binding all placements render nothing. No SDK imports or startup side effects. */
export function DailyAdProvider({binding, children}: {
  binding: DailyAdBinding | null;
  children: React.ReactNode;
}) {
  return <AdContext.Provider value={binding}>{children}</AdContext.Provider>;
}

function useDailyAds() {
  const binding = useContext(AdContext);
  const subscribe = useCallback((listener: () => void) =>
    binding ? binding.subscribe(listener) : subscribeNothing(listener), [binding]);
  const getSnapshot = useCallback(() =>
    binding ? binding.getSnapshot() : getDisconnectedSnapshot(), [binding]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getDisconnectedSnapshot);
  return {binding, snapshot};
}

type PlacementProps = {placement: DailyAdPlacement; environment: DailyAdEnvironment};

/** Place in a flex-column sibling AFTER the map, never absolute/on top of controls.
 * The parent must use the scene's measured height for its map geometry and dock. */
export function DailyAdRail({placement, environment}: PlacementProps) {
  const {binding, snapshot} = useDailyAds();
  const model = dailyAdPresentation(placement, snapshot, environment);
  if (!binding || !model.banner || (placement !== 'home' && placement !== 'street')) return null;
  let banner: React.ReactNode;
  try {
    banner = binding.renderBanner({placement, width: BANNER_WIDTH, height: BANNER_HEIGHT});
  } catch {
    return null;
  }
  if (banner === null || banner === undefined || banner === false) return null;
  return <View testID={`daily-ad-rail-${placement}`} style={styles.rail}>
    <Text style={styles.adLabel}>広告</Text>
    <View style={styles.banner}>{banner}</View>
  </View>;
}

/** Optional reward action, separate from the regular Feed/Buy/Back buttons.
 * Existing backend handles grant, quota, persistence and retry; this UI never does. */
export function DailyAdRewardButton({placement, environment}: PlacementProps) {
  const {binding, snapshot} = useDailyAds();
  const model = dailyAdPresentation(placement, snapshot, environment);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const pressing = useRef(false);
  const mounted = useRef(true);
  const latestSession = useRef(snapshot.sessionKey);
  latestSession.current = snapshot.sessionKey;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setNotice(''); }, [snapshot.sessionKey]);

  const watch = async () => {
    if (!binding || !model.canWatch || pressing.current) return;
    pressing.current = true;
    const session = snapshot.sessionKey;
    setBusy(true);
    setNotice('');
    const result = await rewardGate.watch(binding, placement);
    pressing.current = false;
    if (!mounted.current) return;
    setBusy(false);
    if (latestSession.current === session) setNotice(dailyAdResultMessage(result));
  };

  if (!binding || !model.reward) return null;
  const disabled = busy || !model.canWatch;
  const label = busy || snapshot.phase !== 'idle' ? '広告の受け取りを確認中…' : model.rewardLabel;
  return <View testID={`daily-ad-reward-${placement}`} style={styles.reward}>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint="視聴は任意です。通常のごはんや移動は、広告なしでも利用できます。"
      accessibilityState={{disabled, busy}} disabled={disabled} onPress={watch}
      style={({pressed}) => [styles.button, (disabled || pressed) && styles.dim]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
    <Text style={styles.detail}>{model.rewardDetail}</Text>
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  rail: {
    height: BANNER_RAIL_HEIGHT, flexShrink: 0, paddingTop: 8, paddingBottom: 12,
    alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#211B30',
  },
  adLabel: {fontSize: 10, lineHeight: 12, color: '#C8B9D4'},
  banner: {width: BANNER_WIDTH, height: BANNER_HEIGHT},
  reward: {alignItems: 'stretch', gap: 6, paddingVertical: 12},
  button: {
    minHeight: 48, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 7, borderWidth: 1, borderColor: '#B7A48290', backgroundColor: '#51415F',
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: {fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#F0DDAE', textAlign: 'center'},
  detail: {fontSize: 11, lineHeight: 17, color: '#C8B9D4', textAlign: 'center'},
  notice: {fontSize: 12, lineHeight: 19, color: '#E6DAED', textAlign: 'center'},
  dim: {opacity: 0.5},
});
