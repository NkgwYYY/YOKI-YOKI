/** Browser builds never load native advertising or payment code. */
export const canShowRewardedAd = () => false;
export const canShowBannerAd = () => false;
export const canBuyPass = () => false;
export type AdSession = { playerId: string; id: string };
export type PassOffer = { price: string; productId: string };
export type RevenueEstimate = { micros: number; currency: string; test: boolean };
export async function showRewardedAd(_session: AdSession, _event: (name: string, duration?: number) => void, _paid?: (estimate: RevenueEstimate) => void, _current?: () => boolean): Promise<boolean> { throw Error('広告はアプリ版で利用できます。'); }
export async function adPrivacyOptions(): Promise<void> { throw Error('広告はアプリ版で利用できます。'); }
export async function loadPassOffer(_playerId: string): Promise<PassOffer | null> { return null; }
export async function buyPass(_playerId: string): Promise<void> { throw Error('購入はアプリ版で利用できます。'); }
export async function restorePass(_playerId: string): Promise<void> { throw Error('購入の復元はアプリ版で利用できます。'); }
