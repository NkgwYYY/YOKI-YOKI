import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PurchasesPackage } from 'react-native-purchases';
export type AdSession = { playerId: string; id: string };
export type PassOffer = { price: string; productId: string };
export type RevenueEstimate = { micros: number; currency: string; test: boolean };
const nativeBuild = Constants.appOwnership !== 'expo';
const unit = () => Platform.OS === 'ios' ? (process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS ?? Constants.expoConfig?.extra?.yokiRewardedIosUnit) : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
export const bannerUnit = () => Platform.OS === 'ios' ? Constants.expoConfig?.extra?.yokiBannerIosUnit : Constants.expoConfig?.extra?.yokiBannerAndroidUnit;
const purchaseKey = () => Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
export const canShowRewardedAd = () => nativeBuild && !!unit() && Constants.expoConfig?.extra?.yokiAdsConfigured?.[Platform.OS] === true;
export const canBuyPass = () => nativeBuild && !!purchaseKey() && !!process.env.EXPO_PUBLIC_YOKI_PASS_PRODUCT_ID;
export const canShowBannerAd = () => nativeBuild && !!bannerUnit() && Constants.expoConfig?.extra?.yokiAdsConfigured?.[Platform.OS] === true;
let preparation: Promise<typeof import('react-native-google-mobile-ads')> | null = null;
export function prepareAds() {
  return preparation ??= (async () => {
    const sdk = await import('react-native-google-mobile-ads');
    const consent = await sdk.AdsConsent.gatherConsent();
    if (!consent.canRequestAds) throw Error('広告は現在利用できません。');
    await sdk.default().setRequestConfiguration({maxAdContentRating: sdk.MaxAdContentRating.G});
    await sdk.default().initialize();
    return sdk;
  })().catch(error => { preparation = null; throw error; });
}
// Metrics must never keep a native ad open, strand a promise, or affect rewards.
function reportSafely(operation: () => unknown) {
  try { void Promise.resolve(operation()).catch(() => {}); } catch {}
}
let presenting = false;
export async function showRewardedAd(session: AdSession, event: (name: string, duration?: number) => void, paid?: (estimate: RevenueEstimate) => void, current: () => boolean = () => true): Promise<boolean> {
  if (!current() || !canShowRewardedAd() || presenting) throw Error('いまは広告を用意できません。');
  presenting = true;
  try {
    const sdk = await prepareAds();
    if (!current()) throw Error('利用者が変わりました。');
    const test = __DEV__ || process.env.EXPO_PUBLIC_ADS_TEST_MODE === 'true';
    const ad = sdk.RewardedAd.createForAdRequest(test ? sdk.TestIds.REWARDED : unit()!, {
      requestNonPersonalizedAdsOnly: true,
      serverSideVerificationOptions: { userId: session.playerId, customData: session.id },
    });
    const started = Date.now();
    const report = (name: string, duration?: number) => reportSafely(() => event(name, duration));
    report('ad_request');
    return await new Promise<boolean>((resolve, reject) => {
      let earned = false, shown = false, settled = false;
      const off: (() => void)[] = [];
      let timer: ReturnType<typeof setTimeout> | undefined;
      const clearTimer = () => {
        if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
      };
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimer();
        off.forEach(remove => { try { remove(); } catch {} });
        try { ad.removeAllListeners(); } catch {}
        if (error && !earned) { report('ad_error'); reject(error); }
        else { report('ad_closed', Math.min(300_000, Date.now() - started)); resolve(earned); }
      };
      try {
        off.push(ad.addAdEventListener(sdk.RewardedAdEventType.LOADED, () => {
          if (settled || shown) return;
          report('ad_loaded', Date.now() - started);
          try {
            if (!current() || AppState.currentState !== 'active') {
              finish(Error('画面に戻ってから、もう一度お試しください。')); return;
            }
            clearTimer();
            shown = true;
            // Recover if the native bridge loses its close/error callback.
            // The SDK result never grants points; the server still verifies SSV.
            timer = setTimeout(() => finish(Error('広告の状態を確認できませんでした。')), 180_000);
            // The bridge can throw synchronously as well as reject its promise.
            void ad.show().catch(() => finish(Error('広告を開けませんでした。')));
          } catch { finish(Error('広告を開けませんでした。')); }
        }));
        off.push(ad.addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD, () => {
          if (!settled && shown) earned = true;
        }));
        off.push(ad.addAdEventListener(sdk.AdEventType.PAID, (payload: unknown) => {
          if (settled || !shown) return;
          // v16 emits PaidEvent at runtime but omits it from the fullscreen payload type.
          reportSafely(() => {
            const value = payload as { value?: number; currency?: string } | undefined;
            if (typeof value?.value === 'number' && Number.isFinite(value.value) && typeof value.currency === 'string') {
              return paid?.({micros: Math.round(value.value * 1_000_000), currency: value.currency, test});
            }
          });
        }));
        off.push(ad.addAdEventListener(sdk.AdEventType.CLOSED, () => finish()));
        off.push(ad.addAdEventListener(sdk.AdEventType.ERROR, () => finish(Error('いまは広告を用意できません。時間をおいてお試しください。'))));
        timer = setTimeout(() => { if (!shown) finish(Error('広告の読み込みに時間がかかっています。')); }, 20_000);
        ad.load();
      } catch {
        // A rejected Promise executor alone does not detach previously added listeners.
        // Settle through the same cleanup path so a late LOADED cannot show this ad.
        finish(Error('いまは広告を用意できません。時間をおいてお試しください。'));
      }
    });
  } finally { presenting = false; }
}
export async function adPrivacyOptions() {
  if (!canShowRewardedAd() && !canShowBannerAd()) return;
  const { AdsConsent } = await import('react-native-google-mobile-ads');
  await AdsConsent.showPrivacyOptionsForm();
  preparation = null;
}
let configuredFor: string | undefined;
async function purchases(playerId: string) {
  if (!canBuyPass()) throw Error('購入の準備ができていません。');
  const sdk = (await import('react-native-purchases')).default;
  if (!configuredFor) sdk.configure({ apiKey: purchaseKey()!, appUserID: playerId });
  else if (configuredFor !== playerId) await sdk.logIn(playerId);
  configuredFor = playerId; return sdk;
}
async function packageFor(playerId: string): Promise<PurchasesPackage | null> {
  const sdk = await purchases(playerId), offerings = await sdk.getOfferings();
  // Only the explicitly configured monthly product may ever appear in this paywall.
  return offerings.current?.availablePackages.find(p => p.product.identifier === process.env.EXPO_PUBLIC_YOKI_PASS_PRODUCT_ID && p.product.subscriptionPeriod === 'P1M') ?? null;
}
export async function loadPassOffer(playerId: string): Promise<PassOffer | null> {
  const offer = await packageFor(playerId); return offer ? { price: offer.product.priceString, productId: offer.product.identifier } : null;
}
export async function buyPass(playerId: string) {
  const offer = await packageFor(playerId); if (!offer) throw Error('いまはパスを購入できません。');
  const sdk = await purchases(playerId); await sdk.purchasePackage(offer);
}
export async function restorePass(playerId: string) { const sdk = await purchases(playerId); await sdk.restorePurchases(); }
