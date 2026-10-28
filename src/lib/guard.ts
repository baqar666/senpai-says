import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import RingtoneSetter, { GuardTrigger } from '../../modules/ringtone-setter';
import { Cast, getGirl, GirlId, GuardLine, Honorific, Lang, lineFor } from '../data/girls';
import { GUARD_VIDEOS } from '../data/guard-videos';
import { FREE_GUARD_LIMIT } from './pass';
import { lineAvailable, saveLineFile } from './voice';

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

export type GuardPermissions = { usage: boolean; overlay: boolean; battery: boolean };

export function guardPermissions(): GuardPermissions {
  if (!guardSupported) return { usage: false, overlay: false, battery: false };
  return {
    usage: RingtoneSetter!.hasUsageAccess(),
    overlay: RingtoneSetter!.canDrawOverlays(),
    battery: RingtoneSetter!.isIgnoringBatteryOptimizations(),
  };
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
// GuardOverlay.kt picks with the same rule, so keep the two in sync.
export const GUARD_ORDER: Record<Cast, { gentle: GirlId[]; strict: GirlId[] }> = {
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

const PACK_KEY = 'senpai-says/guard-pack';
const PACK_VERSION = 1;

// Android 15 only lets a background app open a screen if it's already showing an overlay, so the
// watcher draws the warning itself (GuardOverlay.kt) instead of opening the app. This prepares what it
// shows for the chosen group: each character's two lines as MP3s with the user's name, the
// animation, the text and colours. Rebuilt only when the name, language, honorific or group changes.
export async function prepareGuardPack(cast: Cast, name: string, lang: Lang, honorific: Honorific) {
  if (!guardSupported) return;
  const signature = JSON.stringify([PACK_VERSION, cast, name.trim(), lang, honorific]);
  if ((await AsyncStorage.getItem(PACK_KEY).catch(() => null)) === signature) return;

  const { gentle, strict } = GUARD_ORDER[cast];
  const girls: Record<string, unknown> = {};
  for (const id of [...gentle, ...strict]) {
    const girl = getGirl(id);
    const lines: Record<string, unknown> = {};
    for (const key of ['rest', 'rest2'] as GuardLine[]) {
      // Fall back to Japanese while a language's clips are still being generated.
      const l = lineAvailable(girl, key, lang) ? lang : 'jp';
      if (!lineAvailable(girl, key, l)) continue;
      const line = lineFor(id, key, l, name, honorific);
      lines[key] = { text: line.show, sub: line.sub ?? '', audio: await saveLineFile(girl, key, l, name, honorific, `guard-${id}-${key}.mp3`) };
    }
    girls[id] = { name: girl.name, bg: girl.bg, fg: girl.fg, voiceStart: VOICE_START[id], video: await saveVideo(id), lines };
  }
  const appLabels = Object.fromEntries(GUARD_APPS.flatMap((a) => a.packages.map((pkg) => [pkg, a.label])));
  RingtoneSetter!.setGuardPack(JSON.stringify({ gentle, strict, girls, appLabels, snoozeMinutes: SNOOZE_MINUTES }));
  await AsyncStorage.setItem(PACK_KEY, signature).catch(() => {});
}

// Copies the animation out of the app bundle into the documents folder, where native code can play it.
async function saveVideo(id: GirlId): Promise<string | null> {
  const mod = GUARD_VIDEOS[id];
  if (!mod) return null;
  const asset = await Asset.fromModule(mod).downloadAsync();
  // Named by content hash, so an app update with a new animation replaces the old copy.
  const file = new File(Paths.document, `guard-${id}-${asset.hash ?? 'v1'}.mp4`);
  if (!file.exists) {
    file.create();
    await file.write(await new File(asset.localUri!).bytes());
  }
  return file.uri;
}
