import React, {useEffect, useState} from 'react';
import {bannerUnit, canShowBannerAd, prepareAds} from '@/utils/community/commerce.native';

export function CommunityBanner({onError}: {onError: () => void}) {
  const [sdk, setSdk] = useState<Awaited<ReturnType<typeof prepareAds>> | null>(null);
  useEffect(() => {
    let mounted = true;
    if (canShowBannerAd()) void prepareAds().then(value => { if (mounted) setSdk(value); })
      .catch(() => { if (mounted) onError(); });
    return () => { mounted = false; };
  }, [onError]);
  if (!sdk) return null;
  const Banner = sdk.BannerAd;
  const test = __DEV__ || process.env.EXPO_PUBLIC_ADS_TEST_MODE === 'true';
  return <Banner unitId={test ? sdk.TestIds.BANNER : bannerUnit()} size={sdk.BannerAdSize.BANNER}
    requestOptions={{requestNonPersonalizedAdsOnly: true}} onAdFailedToLoad={onError}/>;
}
