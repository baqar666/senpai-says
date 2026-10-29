import { customKey, getCustomName } from '../lib/customNames';
import LINES from './lines.json';
import NAMES from './names.json';
import NAMES_JP_EXTRA from './names_jp_extra.json';

export type GirlId = 'hana' | 'rei' | 'aiko' | 'yui' | 'kaito' | 'ryuga' | 'jin' | 'haru';
// The app shows one group at a time (Settings `cast`); boys use the same lines, voices and art pipeline as girls.
export type Cast = 'girls' | 'boys';
export type Emotion = 'love' | 'angry' | 'miss' | 'shy' | 'night' | 'call';
export type ToneLine = 'call' | 'message' | 'morning';
export type Moment = 'birthday' | 'eid' | 'luck' | 'eat' | 'gym' | 'care' | 'proud' | 'thanks';
// Screen-time guard: a gentle first warning, then a firmer one.
export type GuardLine = 'rest' | 'rest2';
export type LineKey = Emotion | ToneLine | Moment | GuardLine;
export type Lang = 'en' | 'jp';

export type Girl = {
  id: GirlId;
  cast: Cast;
  name: string;
  type: string;
  bg: string;
  fg: string;
  hair: string;
  hairDark: string;
  eye: string;
};

export const CHARACTERS: Girl[] = [
  { id: 'hana', cast: 'girls', name: 'Hana', type: 'Shy dandere', bg: '#FBEAF0', fg: '#72243E', hair: '#ED93B1', hairDark: '#D4537E', eye: '#993556' },
  { id: 'rei', cast: 'girls', name: 'Rei', type: 'Cool kuudere', bg: '#EEEDFE', fg: '#3C3489', hair: '#26215C', hairDark: '#04342C', eye: '#534AB7' },
  { id: 'aiko', cast: 'girls', name: 'Aiko', type: 'Tsundere', bg: '#FAECE7', fg: '#712B13', hair: '#D85A30', hairDark: '#993C1D', eye: '#0F6E56' },
  { id: 'yui', cast: 'girls', name: 'Yui', type: 'Genki', bg: '#FAEEDA', fg: '#633806', hair: '#EF9F27', hairDark: '#BA7517', eye: '#185FA5' },
  { id: 'kaito', cast: 'boys', name: 'Kaito', type: 'The strongest', bg: '#E6F1FB', fg: '#0C447C', hair: '#D8DEE4', hairDark: '#2C2C2A', eye: '#378ADD' },
  { id: 'ryuga', cast: 'boys', name: 'Ryuga', type: 'Dark overlord', bg: '#ECE8F0', fg: '#2C1A3A', hair: '#1E1A24', hairDark: '#000000', eye: '#BA7517' },
  { id: 'jin', cast: 'boys', name: 'Jin', type: 'Silent one', bg: '#F5EBDD', fg: '#6B2A1E', hair: '#8E2A22', hairDark: '#5C1A14', eye: '#1D9E75' },
  { id: 'haru', cast: 'boys', name: 'Haru', type: 'Gentle senpai', bg: '#EAF3DE', fg: '#3B6D11', hair: '#8A6A4A', hairDark: '#5C4430', eye: '#639922' },
];

export const CASTS: { key: Cast; label: string }[] = [
  { key: 'girls', label: 'Girls' },
  { key: 'boys', label: 'Boys' },
];

export const castMembers = (cast: Cast) => CHARACTERS.filter((c) => c.cast === cast);

// "She" or "He", for hints like "She calls you Naruto-kun".
export const pronoun = (g: Girl) => (g.cast === 'boys' ? { subject: 'He', object: 'him' } : { subject: 'She', object: 'her' });

export const EMOTIONS: { key: Emotion; label: string; icon: string }[] = [
  { key: 'love', label: 'Love', icon: 'heart-outline' },
  { key: 'angry', label: 'Angry', icon: 'flame-outline' },
  { key: 'miss', label: 'Miss you', icon: 'sad-outline' },
  { key: 'shy', label: 'Shy', icon: 'happy-outline' },
  { key: 'night', label: 'Good night', icon: 'moon-outline' },
  { key: 'call', label: 'Calling', icon: 'call-outline' },
];

export const MOMENTS: { key: Moment; label: string; icon: string }[] = [
  { key: 'birthday', label: 'Birthday', icon: 'gift-outline' },
  { key: 'eid', label: 'Eid', icon: 'moon-outline' },
  { key: 'luck', label: 'Exam luck', icon: 'school-outline' },
  { key: 'eat', label: 'Eat food', icon: 'restaurant-outline' },
  { key: 'gym', label: 'Gym', icon: 'barbell-outline' },
  { key: 'care', label: 'Take care', icon: 'medkit-outline' },
  { key: 'proud', label: 'Proud', icon: 'trophy-outline' },
  { key: 'thanks', label: 'Thanks', icon: 'flower-outline' },
];

const EMOTION_KEYS = new Set<string>(['love', 'angry', 'miss', 'shy', 'night', 'call']);

// Which face to show for any line: emotions show themselves, other lines name a face in lines.json.
export function faceFor(girl: GirlId, key: LineKey): Emotion {
  if (EMOTION_KEYS.has(key)) return key as Emotion;
  const face = (LINES.lines as Record<GirlId, Record<string, { face?: string }>>)[girl][key]?.face;
  return face && EMOTION_KEYS.has(face) ? (face as Emotion) : 'love';
}


export type Honorific = 'kun' | 'chan' | 'san' | 'none' | 'senpai';
export const HONORIFICS = LINES.honorifics as { key: Honorific; jp: string; en: string; label: string }[];

export type KnownName = { id: string; kana: string };
type NameEntry = string[];

// English has clips for names.json; Japanese also covers names_jp_extra.json.
const NAME_LISTS: Record<Lang, NameEntry[]> = {
  en: NAMES.names,
  jp: [...NAMES.names, ...NAMES_JP_EXTRA.names],
};

// Hiragana → katakana, so a name typed as なると matches ナルト.
const toKatakana = (s: string) => s.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const normalize = (name: string) => {
  const t = name.trim();
  return /[\u3040-\u30ff]/.test(t) ? toKatakana(t).replace(/\s/g, '') : t.toLowerCase().replace(/[^a-z]/g, '');
};

const NAME_INDEX: Record<Lang, Map<string, KnownName>> = { en: new Map(), jp: new Map() };
for (const lang of ['en', 'jp'] as const) {
  for (const [kana, ...spellings] of NAME_LISTS[lang]) {
    const entry = { id: spellings[0], kana };
    for (const s of spellings) NAME_INDEX[lang].set(s, entry);
    NAME_INDEX[lang].set(kana, entry);
  }
}

// Names with recorded voice clips in this language. Anyone else is called "Senpai".
export function findName(name: string, lang: Lang): KnownName | null {
  const builtIn = NAME_INDEX[lang].get(normalize(name));
  if (builtIn) return builtIn;
  // A name the user taught the characters (Japanese voice only); see src/lib/customNames.ts.
  const custom = lang === 'jp' && name.trim() ? getCustomName(name) : undefined;
  return custom ? { id: `${CUSTOM_PREFIX}${customKey(name)}`, kana: custom.kana } : null;
}

export const CUSTOM_PREFIX = 'custom:';

export function suggestNames(name: string, lang: Lang, limit = 4): { label: string; kana: string }[] {
  const q = normalize(name);
  if (q.length < 2 || NAME_INDEX[lang].has(q)) return [];
  const out: { label: string; kana: string }[] = [];
  for (const [kana, ...spellings] of NAME_LISTS[lang]) {
    const hit = spellings.find((s) => s.startsWith(q)) ?? (kana.startsWith(q) ? spellings[0] : undefined);
    if (hit) out.push({ label: hit[0].toUpperCase() + hit.slice(1), kana });
    if (out.length >= limit) break;
  }
  return out;
}

export function getGirl(id: GirlId): Girl {
  return CHARACTERS.find((g) => g.id === id)!;
}

export type ResolvedLine = {
  show: string; // main text on screen
  sub?: string; // translation under it
  known: KnownName | null;
  honorific: Honorific; // honorific actually used (unknown names use senpai; English never has one)
  nameMood: NameMood; // name clip that leads into this line: the name said in the line's own mood
};

export type NameMood = 'sweet' | 'happy' | 'angry' | 'sad';

// Vocal-sound tags like <sigh> are performed by the voice, not shown on screen.
const stripTags = (s: string) => s.replace(/\s*<[^>]+>\s*/g, ' ').replace(/\s+([!?.,])/g, '$1').replace(/\s{2,}/g, ' ').trim();

export function lineFor(girl: GirlId, key: LineKey, lang: Lang, name: string, honorific: Honorific): ResolvedLine {
  const l = (LINES.lines as Record<GirlId, Record<LineKey, { en: string; jp: string; nameMood: NameMood }>>)[girl][key];
  const nameMood = l.nameMood;
  const known = findName(name, lang);
  const hon = known ? honorific : 'senpai';
  const h = HONORIFICS.find((x) => x.key === hon)!;
  const display = name.trim() || 'Senpai';
  const en = stripTags(l.en.replace(/\{n\}/g, known ? `${display}${h.en}` : 'Senpai'));
  if (lang === 'en') {
    // English has no honorifics: just the name, or no name at all when it isn't in the voice list.
    const plain = stripTags(l.en.replace(/\{n\}/g, known ? display : '')).replace(/^[…~!?.,\s]+/, '');
    return { show: plain.charAt(0).toUpperCase() + plain.slice(1), known, honorific: 'none', nameMood };
  }
  const jp = l.jp.replace('{n}', `${known ? known.kana : ''}${h.jp}`);
  return { show: jp, sub: en, known, honorific: hon, nameMood };
}
