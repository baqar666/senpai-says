import { isKana, toKatakana } from 'wanakana';

const VOWEL = /[aeiou]/;

// Best-guess katakana reading for any spelling: "Zarvish" -> ザルヴィシュ, "Aisha" -> アイシャ.
// It's a starting point the user can edit, not a perfect transliteration.
export function suggestReading(name: string): string {
  const t = name.trim().replace(/\s+/g, '');
  if (!t) return '';
  if (isKana(t)) return toKatakana(t);
  const s = t
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ch(?![aeiou])/g, 'k') // Chris -> クリス
    .replace(/([aeiou])h(?![aeiou])/g, '$1') // silent h: Sarah -> サラ
    .replace(/ph/g, 'f')
    .replace(/th/g, 's')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c(?!h)/g, 'k')
    .replace(/l/g, 'r')
    .replace(/mm/g, 'nm') // Muhammad -> ムハンマド
    .replace(/y(?![aeiou])/g, 'i');

  // Japanese syllables end in a vowel or ン, so give a lone consonant a soft vowel: "u", or "o" after t/d.
  let romaji = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const next = s[i + 1];
    romaji += c;
    if (VOWEL.test(c)) continue;
    if (next !== undefined && (VOWEL.test(next) || next === 'y')) continue; // forms a syllable (incl. kya/nya)
    if (c === 'n') continue; // ン
    if (next === c) continue; // doubled consonant: wanakana makes a small ッ
    if ((c === 's' || c === 'c') && next === 'h') continue; // sh / ch
    if (c === 't' && next === 's') continue; // ts
    romaji += c === 't' || c === 'd' ? 'o' : 'u';
  }
  return toKatakana(romaji).replace(/[^ァ-ヶー・]/g, '');
}
