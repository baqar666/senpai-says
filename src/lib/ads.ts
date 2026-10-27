import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Rewarded ads only: the user chooses to watch one to unlock a single ringtone or moment.
// Development builds always use Google's test unit; release builds need EXPO_PUBLIC_ADMOB_REWARDED_ID.
const UNIT = __DEV__ ? TestIds.REWARDED : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? '');
const LOAD_TIMEOUT_MS = 15_000;

export const adsEnabled = !!UNIT;
export type AdResult = 'rewarded' | 'skipped' | 'unavailable';

let started: Promise<boolean> | null = null;

// Asks for consent where the law needs it (EEA/UK, via Google's UMP form), then starts the SDK once.
export function startAds(): Promise<boolean> {
  if (!adsEnabled) return Promise.resolve(false);
  started ??= (async () => {
    // A failed consent request still allows ads with the choice saved from a previous session.
    await AdsConsent.gatherConsent().catch(() => null);
    const { canRequestAds } = await AdsConsent.getConsentInfo();
    if (!canRequestAds) return false;
    await mobileAds().initialize();
    return true;
  })().catch(() => {
    started = null;
    return false;
  });
  return started;
}

// Loads and shows one rewarded ad. "rewarded" only if they watched it to the end.
export async function showRewardedAd(): Promise<AdResult> {
  if (!(await startAds())) return 'unavailable';
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(UNIT);
    let earned = false;
    let finished = false;
    const unsubs: (() => void)[] = [];
    const done = (result: AdResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      unsubs.forEach((u) => u());
      resolve(result);
    };
    const timer = setTimeout(() => done('unavailable'), LOAD_TIMEOUT_MS);
    unsubs.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(timer);
        ad.show().catch(() => done('unavailable'));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => done(earned ? 'rewarded' : 'skipped')),
      ad.addAdEventListener(AdEventType.ERROR, () => done('unavailable'))
    );
    ad.load();
  });
}

// Settings shows "Ad privacy choices" only where Google requires a way to change consent.
export async function privacyOptionsRequired(): Promise<boolean> {
  if (!adsEnabled) return false;
  const info = await AdsConsent.getConsentInfo().catch(() => null);
  return info?.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

export async function showPrivacyOptions() {
  await AdsConsent.showPrivacyOptionsForm().catch(() => null);
}
