import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import RingtoneSetter, { GuardTrigger } from '../../modules/ringtone-setter';
import { Cast, GirlId } from '../data/girls';
import { FREE_GUARD_LIMIT } from './pass';

// Apps the screen-time guard can watch. Each can have a few package names (Lite versions, regions).
export const GUARD_APPS = [
  { id: 'instagram', label: 'Instagram', packages: ['com.instagram.android', 'com.instagram.lite', 'com.instagram.barcelona'] },
  { id: 'tiktok', label: 'TikTok', packages: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'] },
  { id: 'youtube', label: 'YouTube', packages: ['com.google.android.youtube'] },
  { id: 'facebook', label: 'Facebook', packages: ['com.facebook.katana', 'com.facebook.lite'] },
  { id: 'snapchat', label: 'Snapchat', packages: ['com.snapchat.android'] },
] as const;

export type GuardAppId = (typeof GUARD_APPS)[number]['id'];
export const GUARD_LIMITS = [30, 60, 120];

// Seconds into each girl's animation (art/raw/video) when her mouth starts moving,
// so her voice line lines up with it.
export const VOICE_START: Record<GirlId, number> = {
  hana: 1.0,
  rei: 1.0,
  aiko: 0.5,
  yui: 0.3,
  kaito: 0.4,
  ryuga: 1.0,
  jin: 1.5,
  haru: 0.5,
};
export const SNOOZE_MINUTES = 5;

export const guardSupported = Platform.OS === 'android' && !!RingtoneSetter;

export function appLabel(pkg: string) {
  return GUARD_APPS.find((a) => (a.packages as readonly string[]).includes(pkg))?.label ?? 'your phone';
}

export type GuardPermissions = { usage: boolean; overlay: boolean };

export function guardPermissions(): GuardPermissions {
  if (!guardSupported) return { usage: false, overlay: false };
  return { usage: RingtoneSetter!.hasUsageAccess(), overlay: RingtoneSetter!.canDrawOverlays() };
}

// Free users get one app at the 1-hour limit; the Senpai Pass lifts both.
export function effectiveGuard(apps: GuardAppId[], limit: number, pro: boolean) {
  return pro ? { apps, limit } : { apps: apps.slice(0, 1), limit: FREE_GUARD_LIMIT };
}

// Starts or stops the native watcher to match the settings. Safe to call often.
export function syncGuard(on: boolean, chosenApps: GuardAppId[], chosenLimit: number, pro: boolean) {
  if (!guardSupported) return;
  const { apps, limit } = effectiveGuard(chosenApps, chosenLimit, pro);
  const { usage, overlay } = guardPermissions();
  if (on && usage && overlay && apps.length) {
    const packages = GUARD_APPS.filter((a) => apps.includes(a.id)).flatMap((a) => [...a.packages]);
    RingtoneSetter!.startGuard(packages, limit);
  } else {
    RingtoneSetter!.stopGuard();
  }
}

// The first warning of the day comes from someone sweet, later ones from someone stricter.
const GUARD_ORDER: Record<Cast, { gentle: GirlId[]; strict: GirlId[] }> = {
  girls: { gentle: ['hana', 'yui'], strict: ['aiko', 'rei'] },
  boys: { gentle: ['haru', 'kaito'], strict: ['ryuga', 'jin'] },
};

export function guardGirl(level: number, cast: Cast): GirlId {
  const day = Math.floor(Date.now() / 86_400_000);
  const { gentle, strict } = GUARD_ORDER[cast];
  return level <= 1 ? gentle[day % 2] : strict[(day + level) % 2];
}

function initialTrigger(): GuardTrigger | null {
  // Dev preview on web: /?guard=1 (first warning) or /?guard=2 (second).
  if (__DEV__ && Platform.OS === 'web') {
    const level = Number(new URLSearchParams(window.location.search).get('guard'));
    return level ? { level, pkg: 'com.instagram.android' } : null;
  }
  return guardSupported ? RingtoneSetter!.takePendingGuard() : null;
}

// The warning to show right now, if any: from a live event, or one waiting from before the app opened.
export function useGuardTrigger(): [GuardTrigger | null, () => void] {
  const [trigger, setTrigger] = useState<GuardTrigger | null>(initialTrigger);
  useEffect(() => {
    if (!guardSupported) return;
    const take = () => {
      const t = RingtoneSetter!.takePendingGuard();
      if (t) setTrigger(t);
    };
    const ev = RingtoneSetter!.addListener('onGuard', (t) => {
      RingtoneSetter!.takePendingGuard();
      setTrigger(t);
    });
    const app = AppState.addEventListener('change', (s) => s === 'active' && take());
    return () => {
      ev.remove();
      app.remove();
    };
  }, []);
  return [trigger, () => setTrigger(null)];
}
