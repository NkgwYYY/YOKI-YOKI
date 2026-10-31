import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {FeltPressable as Pressable} from '@/components/ui/FeltPressable';
import {colors} from '@/constants/theme';
import {
  BANNER_HEIGHT, BANNER_RAIL_HEIGHT, BANNER_WIDTH,
  createDailyRewardGate, dailyAdPresentation, dailyAdResultMessage, dailyAdNoticeAfterRefresh,
  type DailyAdEnvironment, type DailyAdPlacement, type DailyRewardBinding,
} from '../../utils/dailyAdPlacements';
import {createDailyAdStore} from '../../utils/dailyAdStore';

export interface DailyAdBinding extends DailyRewardBinding {
  /** Subscribe to the existing shared ad store; getSnapshot must be referentially stable. */
  subscribe(listener: () => void): () => void;
  /** Render the real SDK banner at this exact size. No mock/test creatives in production.
   * On no-fill/error the shared store must set bannerAvailable=false. */
  renderBanner(options: {placement: 'home' | 'street'; width: number; height: number; onLoaded: () => void}): React.ReactNode;
  onBannerError?(): void;
  openPrivacy?(): Promise<void>;
}

const disconnectedStore = createDailyAdStore(null);
const AdContext = createContext<{
  binding: DailyAdBinding | null; store: ReturnType<typeof createDailyAdStore>;
  bannerDismissed: boolean; dismissBanner: () => void;
}>({binding: null, store: disconnectedStore, bannerDismissed: false, dismissBanner: () => {}});
const rewardGate = createDailyRewardGate();

/** Connect ONCE to the current ad service, never create one service per placement.
 * Without a binding all placements render nothing. No SDK imports or startup side effects. */
export function DailyAdProvider({binding, children}: {
  binding: DailyAdBinding | null;
  children: React.ReactNode;
}) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const dismissBanner = useCallback(() => setBannerDismissed(true), []);
  const store = useMemo(() => createDailyAdStore(binding), [binding]);
  // Dismissal survives tab changes and service refreshes for this app session.
  const value = useMemo(() => ({binding, store, bannerDismissed, dismissBanner}), [binding, store, bannerDismissed, dismissBanner]);
  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useDailyAds() {
  const {binding, store} = useContext(AdContext);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {binding, snapshot};
}

type PlacementProps = {placement: DailyAdPlacement; environment: DailyAdEnvironment};

/** A separate rail below the clipped scene, never over the room or care controls.
 * The room camera must use the full HOME surface, independent of this rail. */
export function DailyAdRail({placement, environment, bottomInset = 0}: PlacementProps & {bottomInset?: number}) {
  const {binding, snapshot} = useDailyAds();
  const {bannerDismissed, dismissBanner} = useContext(AdContext);
  const model = dailyAdPresentation(placement, snapshot, environment);
  // Keep a loaded creative mounted through a gesture/sheet. No extra ad request
  // or geometric change simply because an interaction briefly hides it.
  const eligible = dailyAdPresentation(placement, {...snapshot, phase: 'idle'}, {...environment, interacting: false, obscured: false, keyboardOpen: false}).banner;
  if (!binding || !eligible || bannerDismissed || (placement !== 'home' && placement !== 'street')) return null;
  return <AdBannerBoundary key={`${snapshot.sessionKey}:${placement}`} onError={binding.onBannerError}>
    <AdBannerContent binding={binding} placement={placement} visible={model.banner} bottomInset={bottomInset} onDismiss={dismissBanner}/>
  </AdBannerBoundary>;
}

/** A surrounding try/catch cannot catch an SDK child failing in React's render.
 * Drop only the ad subtree (including its rail), not the HOME/care screen. */
class AdBannerBoundary extends React.Component<{children?: React.ReactNode; onError?: () => void}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { try { this.props.onError?.(); } catch {} }
  render() { return this.state.failed ? null : this.props.children; }
}

function AdBannerContent({binding, placement, visible, bottomInset, onDismiss}: {
  binding: DailyAdBinding; placement: 'home' | 'street'; visible: boolean; bottomInset: number; onDismiss: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const onLoaded = useCallback(() => setLoaded(true), []);
  const banner = binding.renderBanner({placement, width: BANNER_WIDTH, height: BANNER_HEIGHT, onLoaded});
  if (banner === null || banner === undefined || banner === false) return null;
  const shown = loaded && visible;
  // Request at the real SDK size while clipped. Until onAdLoaded, neither an
  // empty box nor the label is visible and no space is taken from HOME.
  return <View testID={loaded ? `daily-ad-rail-${placement}` : `daily-ad-loading-${placement}`}
    style={{height: loaded ? BANNER_RAIL_HEIGHT + bottomInset : 0, overflow: 'hidden'}}
    pointerEvents={shown ? 'auto' : 'none'} accessibilityElementsHidden={!shown} importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}>
    <View style={[styles.rail, {opacity: shown ? 1 : 0}]}>
      <View style={styles.adHeader}><Text style={styles.adLabel}>広告</Text>
        <Pressable testID={`daily-ad-close-${placement}`} accessibilityRole="button" accessibilityLabel="広告を閉じる"
          accessibilityHint="今回の起動中は、この広告枠を表示しません。" onPress={onDismiss} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.banner}>{banner}</View>
    </View>
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
  useEffect(() => {
    setNotice(previous => dailyAdNoticeAfterRefresh(previous, snapshot));
  }, [snapshot.ready, snapshot.phase, notice]);

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

  const privacyAvailable = !!binding?.openPrivacy && environment.screenActive && environment.foreground &&
    !environment.obscured && !environment.keyboardOpen && !environment.interacting &&
    snapshot.ready && (snapshot.rewardedAvailable || snapshot.bannerAvailable);
  const privacy = async () => {
    const session = snapshot.sessionKey;
    try {
      await binding?.openPrivacy?.();
    } catch {
      if (mounted.current && latestSession.current === session) setNotice('広告設定は現在変更できません。時間をおいてお試しください。');
    }
  };
  if (!binding || (!model.reward && !privacyAvailable)) return null;
  const busy = localBusy || snapshot.phase !== 'idle';
  const disabled = busy || !model.canWatch;
  const label = busy ? '広告の受け取りを確認中…' : model.rewardLabel;
  return <View testID={`daily-ad-reward-${placement}`} style={styles.reward}>
    {model.reward && <><Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint="視聴は任意です。通常のごはんや移動は、広告なしでも利用できます。"
      accessibilityState={{disabled, busy}} disabled={disabled} onPress={watch}
      style={({pressed}) => [styles.button, (disabled || pressed) && styles.dim]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
    <Text style={styles.detail}>{model.rewardDetail}</Text></>}
    {privacyAvailable && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void privacy()}
      style={styles.privacy}><Text style={styles.detail}>広告のプライバシー設定</Text></Pressable>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  rail: {
    height: BANNER_RAIL_HEIGHT, flexShrink: 0, paddingBottom: 10,
    alignItems: 'center', gap: 8, backgroundColor: colors.sheet,
  },
  adHeader: {height: 44, width: '100%', alignItems: 'center', justifyContent: 'center'},
  close: {position: 'absolute', top: 0, right: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  closeText: {fontSize: 24, lineHeight: 28, color: colors.foreground},
  adLabel: {fontSize: 10, lineHeight: 12, color: colors.mutedForeground},
  banner: {width: BANNER_WIDTH, height: BANNER_HEIGHT},
  reward: {alignItems: 'stretch', gap: 6, paddingVertical: 12},
  button: {
    minHeight: 48, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: {fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.primaryForeground, textAlign: 'center'},
  detail: {fontSize: 12, lineHeight: 18, color: colors.mutedForeground, textAlign: 'center'},
  privacy: {minHeight: 44, justifyContent: 'center', alignItems: 'center'},
  notice: {fontSize: 12, lineHeight: 19, color: colors.foreground, textAlign: 'center'},
  dim: {opacity: 0.5},
});

