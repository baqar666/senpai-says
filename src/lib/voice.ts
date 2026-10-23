import { Asset } from 'expo-asset';
import { AudioPlayer, AudioSource, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

import RingtoneSetter, { ToneType } from '../../modules/ringtone-setter';
import { Girl, Honorific, Lang, LineKey, lineFor } from '../data/girls';
import { VOICE_CLIPS } from '../data/voice-assets';

setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

// Plays the girl saying the name, then the rest of the line (Japanese: VOICEVOX, English: Kokoro).
// Unknown names skip the name clip and use the "senpai" version of the line.
function clipsFor(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific): number[] {
  const l = lineFor(girl.id, key, lang, name, honorific);
  const lines = VOICE_CLIPS[lang][girl.id].lines as Partial<Record<LineKey, Record<Honorific, number>>>;
  const line = lines[key];
  if (!line) return [];
  const clips = VOICE_CLIPS[lang][girl.id];
  const rest = line[l.honorific];
  return l.known ? [(clips.names as Record<string, Record<'soft' | 'loud', number>>)[l.known.id][l.tone], rest] : [rest];
}

// True once this line's clips are generated for the language (new lines can lag behind).
export function lineAvailable(girl: Girl, key: LineKey, lang: Lang): boolean {
  return key in VOICE_CLIPS[lang][girl.id].lines;
}

let player: AudioPlayer | null = null;
let queue: AudioSource[] = [];
let onQueueEnd: (() => void) | undefined;

function playNext() {
  const src = queue.shift();
  if (src === undefined) {
    const cb = onQueueEnd;
    onQueueEnd = undefined;
    cb?.();
    return;
  }
  player!.replace(src);
  player!.play();
}

function getPlayer() {
  if (!player) {
    player = createAudioPlayer(null);
    player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) playNext();
    });
  }
  return player;
}

export function stopSpeaking() {
  queue = [];
  const cb = onQueueEnd;
  onQueueEnd = undefined;
  player?.pause();
  cb?.();
}

export function playLine(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific, onEnd?: () => void) {
  stopSpeaking();
  getPlayer();
  queue = clipsFor(girl, key, lang, name, honorific);
  onQueueEnd = onEnd;
  playNext();
}

const TYPE_LABEL: Record<ToneType, string> = {
  ringtone: 'ringtone',
  notification: 'message tone',
  alarm: 'alarm sound',
};

// Returns a success message, or null if the user needs to act first.
export async function setTone(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific, type: ToneType, title: string): Promise<string | null> {
  if (Platform.OS !== 'android') {
    Alert.alert('Android only', "iPhone doesn't let apps change ringtones. You can still play the voice lines.");
    return null;
  }
  if (!RingtoneSetter) {
    Alert.alert('Needs the full app', 'Setting tones only works in the installed app build, not in Expo Go.');
    return null;
  }
  if (!RingtoneSetter.canWriteSettings()) {
    Alert.alert(
      'Allow changing tones',
      `To set ${girl.name} as your ${TYPE_LABEL[type]}, turn on "Modify system settings" for this app, then come back and tap again.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => RingtoneSetter?.openWriteSettings() },
      ]
    );
    return null;
  }
  if (Number(Platform.Version) < 29) {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    if (res !== PermissionsAndroid.RESULTS.GRANTED) return null;
  }
  const safeTitle = title.replace(/[^\w\- ]+/g, '').trim() || 'Senpai tone';
  const assets = await Promise.all(clipsFor(girl, key, lang, name, honorific).map((m) => Asset.fromModule(m).downloadAsync()));
  await RingtoneSetter.setToneFromFilesAsync(
    assets.map((a) => a.localUri!),
    safeTitle,
    type
  );
  return `${girl.name} is now your ${TYPE_LABEL[type]}`;
}

// Joins the name clip and the line into one MP3 (the clips are header-free CBR, so bytes concatenate cleanly).
async function joinedClip(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific): Promise<Uint8Array> {
  const assets = await Promise.all(clipsFor(girl, key, lang, name, honorific).map((m) => Asset.fromModule(m).downloadAsync()));
  const parts =
    Platform.OS === 'web'
      ? await Promise.all(assets.map(async (a) => new Uint8Array(await (await fetch(a.localUri ?? a.uri)).arrayBuffer())))
      : await Promise.all(assets.map((a) => new File(a.localUri!).bytes()));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// Shares the voice line as an MP3 (WhatsApp, TikTok, Instagram…). On web it downloads instead.
export async function shareLine(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific): Promise<boolean> {
  const bytes = await joinedClip(girl, key, lang, name, honorific);
  const fileName = `${girl.name}-says-${(name.trim() || 'senpai').replace(/[^\w-]+/g, '')}-${key}.mp3`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/mpeg' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing not available', "This phone doesn't support sharing files.");
    return false;
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: 'audio/mpeg', dialogTitle: `Share ${girl.name}'s voice` });
  return true;
}
