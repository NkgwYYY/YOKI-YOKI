// AdMob IDs are public app identifiers. Delivery remains gated by the server flag.
module.exports = ({ config }) => {
  const iosAppId = process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-7462386033661667~3120761930';
  const androidAppId = process.env.ADMOB_ANDROID_APP_ID;
  const validAppId = value => /^ca-app-pub-\d+~\d+$/.test(value || '') && !value.startsWith('ca-app-pub-3940256099942544~');
  const bannerId = value => /^ca-app-pub-\d+\/\d+$/.test(value || '') && !value.startsWith('ca-app-pub-3940256099942544/') ? value : null;
  const configured = { ios: validAppId(iosAppId), android: validAppId(androidAppId) };
  return {
    ...config,
    extra: {
      ...config.extra,
      yokiAdsConfigured: configured,
      yokiRewardedIosUnit: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS ?? 'ca-app-pub-7462386033661667/5206949357',
      // Banner units must be provisioned separately from rewarded units.
      yokiBannerIosUnit: bannerId(process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? 'ca-app-pub-7462386033661667/1745376179'),
      yokiBannerAndroidUnit: bannerId(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID),
    },
    plugins: [...(config.plugins || []), ['react-native-google-mobile-ads', {
      // Each platform is independent. Unconfigured platforms use official sample IDs.
      iosAppId: configured.ios ? iosAppId : 'ca-app-pub-3940256099942544~1458002511',
      androidAppId: configured.android ? androidAppId : 'ca-app-pub-3940256099942544~3347511713',
      delayAppMeasurementInit: true,
    }]],
  };
};
