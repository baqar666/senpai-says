import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { unzipSync } from 'fflate';
import { Platform } from 'react-native';

export { suggestReading } from './reading';

// "Teach them your name": names that aren't built in are voiced by our name server
// (server/ in this repo) and saved on the phone, so they work offline from then on.
// Japanese only for now: English custom names would need the much slower English voice model.

const SERVER = (process.env.EXPO_PUBLIC_NAME_VOICE_URL ?? (__DEV__ ? 'http://127.0.0.1:7860' : '')).replace(/\/$/, '');
const STORE_KEY = 'senpai-says/custom-names';
const KANA = /^[ァ-ヶー・]{1,20}$/;
const TIMEOUT_MS = 150_000; // a sleeping free server can take a minute or two to wake up

export const customNamesEnabled = !!SERVER;

// Per name: its reading, and each character's clip per mood as a file URI.
export type CustomName = { kana: string; files: Record<string, Record<string, string>> };

let registry: Record<string, CustomName> = {};
const listeners = new Set<() => void>();

export const customKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export async function loadCustomNames() {
  const saved = await AsyncStorage.getItem(STORE_KEY).catch(() => null);
  registry = saved ? JSON.parse(saved) : {};
  listeners.forEach((l) => l());
}

export function getCustomName(name: string): CustomName | undefined {
  return registry[customKey(name)];
}

export function onCustomNamesChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const validReading = (kana: string) => KANA.test(kana);

export type TeachResult = 'ok' | 'invalid' | 'offline' | 'busy' | 'unavailable' | 'error';

// Downloads the name's voice for every character and mood, saves it, and registers the name.
export async function teachName(name: string, kana: string): Promise<TeachResult> {
  if (!validReading(kana)) return 'invalid';
  if (!SERVER) return 'unavailable';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let zip: Uint8Array;
  try {
    const res = await fetch(`${SERVER}/name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kana }),
      signal: controller.signal,
    });
    if (res.status === 400) return 'invalid';
    if (res.status === 429) return 'busy';
    if (!res.ok) return 'error';
    zip = new Uint8Array(await res.arrayBuffer());
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }

  const entries = unzipSync(zip);
  const key = customKey(name);
  const files: CustomName['files'] = {};
  if (Platform.OS === 'web') {
    // No file system on web: keep the clips as in-memory URLs (enough for the dev preview).
    for (const [path, bytes] of Object.entries(entries)) {
      const [gid, file] = path.split('/');
      (files[gid] ??= {})[file.replace('.mp3', '')] = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/mpeg' }));
    }
  } else {
    const dir = new Directory(Paths.document, 'names', slug(key));
    if (dir.exists) dir.delete();
    dir.create({ intermediates: true });
    for (const [path, bytes] of Object.entries(entries)) {
      const [gid, file] = path.split('/');
      const out = new File(dir, `${gid}_${file}`);
      out.create();
      out.write(bytes);
      (files[gid] ??= {})[file.replace('.mp3', '')] = out.uri;
    }
  }
  registry = { ...registry, [key]: { kana, files } };
  if (Platform.OS !== 'web') await AsyncStorage.setItem(STORE_KEY, JSON.stringify(registry)).catch(() => {});
  listeners.forEach((l) => l());
  return 'ok';
}

const slug = (key: string) => key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `name-${Date.now()}`;
