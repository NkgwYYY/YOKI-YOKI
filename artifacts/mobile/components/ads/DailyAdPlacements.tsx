import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BANNER_HEIGHT, BANNER_RAIL_HEIGHT, BANNER_WIDTH,
  createDailyRewardGate, dailyAdPresentation, dailyAdResultMessage,
  type DailyAdEnvironment, type DailyAdPlacement, type DailyRewardBinding,
} from '../../utils/dailyAdPlacements';
import {createDailyAdStore} from '../../utils/dailyAdStore';

export interface DailyAdBinding extends DailyRewardBinding {
  /** Subscribe to the existing shared ad store; getSnapshot must be referentially stable. */
  subscribe(listener: () => void): () => void;
  /** Render the real SDK banner at this exact size. No mock/test creatives in production.
   * On no-fill/error the shared store must set bannerAvailable=false. */
  renderBanner(options: {placement: 'home' | 'street'; width: number; height: number}): React.ReactNode;
}

const disconnectedStore = createDailyAdStore(null);
const AdContext = createContext<{
  binding: DailyAdBinding | null; store: ReturnType<typeof createDailyAdStore>;
}>({binding: null, store: disconnectedStore});
const rewardGate = createDailyRewardGate();

/** Connect ONCE to the current ad service, never create one service per placement.
 * Without a binding all placements render nothing. No SDK imports or startup side effects. */
export function DailyAdProvider({binding, children}: {
  binding: DailyAdBinding | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({binding, store: createDailyAdStore(binding)}), [binding]);
  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

function useDailyAds() {
  const {binding, store} = useContext(AdContext);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {binding, snapshot};
}

type PlacementProps = {placement: DailyAdPlacement; environment: DailyAdEnvironment};

/** Place in a flex-column sibling AFTER the map, never absolute/on top of controls.
 * The parent must use the scene's measured height for its map geometry and dock. */
export function DailyAdRail({placement, environment}: PlacementProps) {
  const {binding, snapshot} = useDailyAds();
  const model = dailyAdPresentation(placement, snapshot, environment);
  if (!binding || !model.banner || (placement !== 'home' && placement !== 'street')) return null;
  return <AdBannerBoundary key={`${snapshot.sessionKey}:${snapshot.revision}:${placement}`}>
    <AdBannerContent binding={binding} placement={placement}/>
  </AdBannerBoundary>;
}

/** A surrounding try/catch cannot catch an SDK child failing in React's render.
 * Drop only the ad subtree (including its rail), not the HOME/care screen. */
class AdBannerBoundary extends React.Component<{children?: React.ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() { return this.state.failed ? null : this.props.children; }
}

function AdBannerContent({binding, placement}: {
  binding: DailyAdBinding; placement: 'home' | 'street';
}) {
  const banner = binding.renderBanner({placement, width: BANNER_WIDTH, height: BANNER_HEIGHT});
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
  const [localBusy, setBusy] = useState(false);
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
  const busy = localBusy || snapshot.phase !== 'idle';
  const disabled = busy || !model.canWatch;
  const label = busy ? '広告の受け取りを確認中…' : model.rewardLabel;
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
