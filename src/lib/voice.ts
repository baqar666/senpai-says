import { Asset } from 'expo-asset';
import { AudioPlayer, AudioSource, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

import RingtoneSetter, { ToneType } from '../../modules/ringtone-setter';
import { CUSTOM_PREFIX, Girl, Honorific, Lang, LineKey, lineFor } from '../data/girls';
import { VOICE_CLIPS } from '../data/voice-assets';
import { getCustomName } from './customNames';

setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

type CharacterClips = {
  names: Record<string, Partial<Record<string, number>>>;
  lines: Partial<Record<LineKey, Partial<Record<Honorific, number>>>>; // English: only 'none'
};

// A character's clips for a language, if generated yet (new characters can lag behind in one language).
function voiceFor(girl: Girl, lang: Lang): CharacterClips | undefined {
  return (VOICE_CLIPS[lang] as unknown as Partial<Record<Girl['id'], CharacterClips>>)[girl.id];
}

// A clip is a bundled asset (number) or, for names the user taught, a saved file URI (string).
type Clip = number | string;

// Plays the character saying the name, then the rest of the line (Japanese: VOICEVOX, English: Orpheus).
// Unknown names skip the name clip (Japanese uses the "senpai" version of the line).
function clipsFor(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific): Clip[] {
  const l = lineFor(girl.id, key, lang, name, honorific);
  const clips = voiceFor(girl, lang);
  const line = clips?.lines[key];
  if (!clips || !line) return [];
  const rest = line[l.honorific];
  if (rest === undefined) return [];
  let nameClip: Clip | undefined;
  if (l.known?.id.startsWith(CUSTOM_PREFIX)) {
    nameClip = getCustomName(name)?.files[girl.id]?.[l.nameMood];
  } else if (l.known) {
    // The name in the line's own mood, so it matches the feeling of the sentence.
    nameClip = clips.names[l.known.id]?.[l.nameMood];
  }
  return nameClip !== undefined ? [nameClip, rest] : [rest];
}

const toSource = (c: Clip): AudioSource => (typeof c === 'string' ? { uri: c } : c);

// File URIs for each clip (bundled assets are copied out of the app first).
async function clipFiles(clips: Clip[]): Promise<string[]> {
  return Promise.all(
    clips.map(async (c) => (typeof c === 'string' ? c : (await Asset.fromModule(c).downloadAsync()).localUri ?? Asset.fromModule(c).uri))
  );
}

// True once this line's clips are generated for the language (new lines can lag behind).
export function lineAvailable(girl: Girl, key: LineKey, lang: Lang): boolean {
  return !!voiceFor(girl, lang)?.lines[key];
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
  queue = clipsFor(girl, key, lang, name, honorific).map(toSource);
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
  await RingtoneSetter.setToneFromFilesAsync(await clipFiles(clipsFor(girl, key, lang, name, honorific)), safeTitle, type);
  return `${girl.name} is now your ${TYPE_LABEL[type]}`;
}

// Joins the name clip and the line into one MP3 (the clips are header-free CBR, so bytes concatenate cleanly).
async function joinedClip(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific): Promise<Uint8Array> {
  const files = await clipFiles(clipsFor(girl, key, lang, name, honorific));
  const parts =
    Platform.OS === 'web'
      ? await Promise.all(files.map(async (f) => new Uint8Array(await (await fetch(f)).arrayBuffer())))
      : await Promise.all(files.map((f) => new File(f).bytes()));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// Saves the line (name + rest) as an MP3 in the app's documents folder and returns its file URI.
// Used by the screen-time overlay, which plays it natively while the app isn't running.
export async function saveLineFile(girl: Girl, key: LineKey, lang: Lang, name: string, honorific: Honorific, fileName: string): Promise<string> {
  const bytes = await joinedClip(girl, key, lang, name, honorific);
  const file = new File(Paths.document, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);
  return file.uri;
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
