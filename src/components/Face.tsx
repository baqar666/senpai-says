import { memo, useMemo } from 'react';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { ART } from '../data/art';
import { Emotion, Girl } from '../data/girls';

// Drawn fallback faces, used wherever art/raw has no portrait yet (see scripts/process_art.py).
function faceXml(o: Girl, em: Emotion) {
  const S = '#FCE6D6';
  const D = '#2C2C2A';
  let back = '';
  let front = '';
  let eyes = '';
  let brows = '';
  let mouth = '';
  let extra = '';
  if (o.id === 'hana') {
    back = `<path d="M20 50 Q18 92 26 98 L74 98 Q82 92 80 50Z" fill="${o.hair}"/>`;
    front = `<circle cx="71" cy="32" r="5" fill="#F4C0D1"/><circle cx="71" cy="32" r="2" fill="#D4537E"/>`;
  }
  if (o.id === 'rei') {
    back = `<path d="M22 50 Q20 80 30 84 L70 84 Q80 80 78 50Z" fill="${o.hair}"/>`;
    front = `<path d="M28 86 Q50 96 72 86 L74 98 L26 98Z" fill="#A32D2D"/>`;
  }
  if (o.id === 'aiko') {
    back = `<ellipse cx="14" cy="66" rx="9" ry="22" fill="${o.hair}"/><ellipse cx="86" cy="66" rx="9" ry="22" fill="${o.hair}"/><circle cx="22" cy="40" r="4" fill="#E24B4A"/><circle cx="78" cy="40" r="4" fill="#E24B4A"/>`;
  }
  if (o.id === 'yui') {
    back = `<ellipse cx="84" cy="40" rx="10" ry="18" transform="rotate(25 84 40)" fill="${o.hair}"/>`;
    front = `<path d="M29 36 l3 -6 l3 6 l-6 -3 l6 0Z" fill="#FAC775" stroke="#BA7517" stroke-width="0.8"/>`;
  }
  const eye = (x: number) =>
    `<ellipse cx="${x}" cy="59" rx="4.2" ry="5.5" fill="${o.eye}"/><ellipse cx="${x}" cy="60" rx="2.4" ry="3.2" fill="${D}"/><circle cx="${x + 1.4}" cy="57" r="1.4" fill="#fff"/>`;
  const blush = (a: number) =>
    `<ellipse cx="34" cy="67" rx="5" ry="2.6" fill="#ED93B1" opacity="${a}"/><ellipse cx="66" cy="67" rx="5" ry="2.6" fill="#ED93B1" opacity="${a}"/>`;
  const line = (d: string, w = 1.5) => `<path d="${d}" stroke="${D}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

  switch (em) {
    case 'love':
      eyes = eye(40) + eye(60);
      mouth = line('M45 70 Q50 75 55 70');
      extra = blush(0.7) + `<path d="M84 18 c-3-4-9-1-6 4 l6 6 l6-6 c3-5-3-8-6-4Z" fill="#E24B4A"/>`;
      break;
    case 'angry':
      eyes = eye(40) + eye(60);
      brows = line('M34 48 L45 52 M66 48 L55 52', 2);
      mouth = line('M45 73 Q50 69 55 73');
      extra = `<path d="M78 20 l4 4 m0 -4 l-4 4 M84 26 l4 4 m0 -4 l-4 4" stroke="#E24B4A" stroke-width="2" stroke-linecap="round"/>` + blush(0.4);
      break;
    case 'miss':
      eyes = eye(40) + eye(60);
      brows = line('M35 51 L45 48 M65 51 L55 48', 1.6);
      mouth = line('M46 72 Q50 69 54 72');
      extra = `<path d="M37 65 q-2 5 0 7 q2 -2 0 -7Z" fill="#85B7EB"/>` + blush(0.4);
      break;
    case 'shy':
      eyes = line('M36 60 Q40 55 44 60 M56 60 Q60 55 64 60', 1.8);
      mouth = line('M47 71 q1.5 -1.5 3 0 q1.5 1.5 3 0', 1.3);
      extra = blush(0.95) + `<path d="M30 66 l2 -3 M34 66 l2 -3 M64 66 l2 -3 M68 66 l2 -3" stroke="#D4537E" stroke-width="1"/>`;
      break;
    case 'night':
      eyes = line('M36 58 Q40 62 44 58 M56 58 Q60 62 64 58', 1.8);
      mouth = `<ellipse cx="50" cy="71" rx="2" ry="1.4" fill="${D}"/>`;
      extra = blush(0.5) + `<path d="M76 20 h6 l-6 7 h6 M84 10 h5 l-5 6 h5" stroke="#534AB7" stroke-width="1.4" fill="none" stroke-linejoin="round"/>`;
      break;
    case 'call':
      eyes = eye(40) + eye(60);
      brows = line('M35 49 Q40 46 45 49 M55 49 Q60 46 65 49', 1.4);
      mouth = `<ellipse cx="50" cy="71" rx="3.2" ry="3" fill="#993556"/>`;
      extra = blush(0.5) + `<path d="M82 22 q4 4 0 8 M86 19 q7 7 0 14" stroke="#1D9E75" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      break;
  }
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${o.bg}"/>${back}<rect x="44" y="78" width="12" height="10" fill="${S}"/><ellipse cx="50" cy="57" rx="26" ry="27" fill="${S}"/><path d="M22 54 Q20 22 50 21 Q80 22 78 54 Q72 40 64 44 Q58 34 50 43 Q42 34 36 44 Q28 40 22 54Z" fill="${o.hair}"/><path d="M50 21 Q46 30 50 43" stroke="${o.hairDark}" stroke-width="1" fill="none"/>${front}${brows}${eyes}${mouth}${extra}</svg>`;
}

export const Face = memo(function Face({ girl, emotion, size }: { girl: Girl; emotion: Emotion; size: number }) {
  const art = ART[girl.id]?.[emotion];
  const xml = useMemo(() => (art ? '' : faceXml(girl, emotion)), [art, girl, emotion]);
  const label = `${girl.name} looking ${emotion}`;
  if (art) {
    return (
      <Image
        source={art}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: girl.bg }}
        accessibilityLabel={label}
        fadeDuration={0}
      />
    );
  }
  return <SvgXml xml={xml} width={size} height={size} accessibilityLabel={label} />;
});
