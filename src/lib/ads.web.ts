// No ads on web (AdMob is native-only). In development a fake "ad" lets the unlock flow be tested.
export const adsEnabled = __DEV__;
export type AdResult = 'rewarded' | 'skipped' | 'unavailable';

export const startAds = async () => adsEnabled;
export const showRewardedAd = async (): Promise<AdResult> =>
  adsEnabled ? new Promise((resolve) => setTimeout(() => resolve('rewarded'), 800)) : 'unavailable';
export const privacyOptionsRequired = async () => false;
export const showPrivacyOptions = async () => {};
