import { Directory, File, Paths } from 'expo-file-system';
import { unzipSync } from 'fflate';
import { Platform } from 'react-native';

import { Lang } from '../data/girls';

// Most name clips aren't inside the app, to keep the download small. Each name's clips are one small
// zip (scripts/build_name_packs.py) fetched the first time it's used, then kept on the phone for offline use.
// Bump the version in the URL when clips are regenerated, so phones fetch the new ones.

const BASE = (process.env.EXPO_PUBLIC_NAME_PACK_URL ?? 'https://baqar666.github.io/senpai-says/packs/v1').replace(/\/$/, '');
const TIMEOUT_MS = 30_000;

export type PackResult = 'ok' | 'offline';

const inFlight = new Map<string, Promise<PackResult>>();
const webClips = new Map<string, string>(); // no file system on web (dev preview): in-memory URLs

const packDir = (lang: Lang, id: string) => new Directory(Paths.document, 'name-packs', lang, id);

export function packClip(lang: Lang, id: string, gid: string, mood: string): string | undefined {
  if (Platform.OS === 'web') return webClips.get(`${lang}/${id}/${gid}_${mood}`);
  const file = new File(packDir(lang, id), `${gid}_${mood}.mp3`);
  return file.exists ? file.uri : undefined;
}

async function download(lang: Lang, id: string): Promise<PackResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let entries: Record<string, Uint8Array>;
  try {
    const res = await fetch(`${BASE}/${lang}/${id}.zip`, { signal: controller.signal });
    if (!res.ok) return 'offline';
    entries = unzipSync(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
  if (Platform.OS === 'web') {
    for (const [path, bytes] of Object.entries(entries)) {
      const key = `${lang}/${id}/${path.replace('/', '_').replace('.mp3', '')}`;
      webClips.set(key, URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/mpeg' })));
    }
    return 'ok';
  }
  // Written beside the final folder and moved in at the end, so a half-saved name never counts as saved.
  const tmp = new Directory(Paths.document, 'name-packs', `${lang}-${id}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create({ intermediates: true });
  for (const [path, bytes] of Object.entries(entries)) {
    const out = new File(tmp, path.replace('/', '_'));
    out.create();
    out.write(bytes);
  }
  const parent = new Directory(Paths.document, 'name-packs', lang);
  if (!parent.exists) parent.create({ intermediates: true });
  const dir = packDir(lang, id);
  if (dir.exists) dir.delete();
  tmp.move(dir);
  return 'ok';
}

// Fetches a name's clips unless the phone already has them. Safe to call repeatedly.
export function ensureNamePack(lang: Lang, id: string): Promise<PackResult> {
  if (packClip(lang, id, 'hana', 'sweet')) return Promise.resolve('ok');
  const key = `${lang}/${id}`;
  let job = inFlight.get(key);
  if (!job) {
    job = download(lang, id)
      .catch((): PackResult => 'offline')
      .finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }
  return job;
}
