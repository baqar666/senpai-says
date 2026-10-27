import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { Cast, castMembers, getGirl, GirlId, Honorific, Lang, LineKey, lineFor } from '../data/girls';
import { lineAvailable } from './voice';

export type DailyPick = { girl: GirlId; key: LineKey };
type Settings = { enabled: boolean; hour: number; name: string; lang: Lang; honorific: Honorific; cast: Cast };

const CHANNEL = 'daily-message';
const DAYS_AHEAD = 7;
// Sweet, everyday lines; special moments that aren't generated for the language are skipped.
const POOL: LineKey[] = ['love', 'miss', 'shy', 'night', 'morning', 'care', 'proud', 'eat', 'luck', 'thanks'];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const dayNumber = (d: Date) => Math.floor(d.getTime() / 86_400_000);

// Varies by day so each notification is a different character (from the chosen group) and line.
function pickFor(date: Date, lang: Lang, cast: Cast): DailyPick {
  const n = dayNumber(date);
  const members = castMembers(cast);
  const girl = members[n % members.length];
  const pool = POOL.filter((k) => lineAvailable(girl, k, lang));
  return { girl: girl.id, key: pool[(n * 7) % pool.length] };
}

// Re-plans the next week of daily messages. Called on app start and when settings change.
export async function scheduleDaily(s: Settings): Promise<'scheduled' | 'off' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.enabled) return 'off';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily message',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return 'denied';

  const now = new Date();
  for (let d = 0; d < DAYS_AHEAD + 1; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, s.hour, 0, 0);
    if (date <= now) continue;
    const pick = pickFor(date, s.lang, s.cast);
    const girl = getGirl(pick.girl);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${girl.name} has a message for you 💌`,
        body: lineFor(pick.girl, pick.key, s.lang, s.name, s.honorific).show,
        data: pick,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
  return 'scheduled';
}

// Tiny event hub: the root layout reports a tapped notification, the Girls screen plays it.
let pending: DailyPick | null = null;
const listeners = new Set<(p: DailyPick) => void>();

export function openDaily(p: DailyPick) {
  pending = p;
  listeners.forEach((l) => l(p));
}

export function onDailyOpen(listener: (p: DailyPick) => void): () => void {
  listeners.add(listener);
  if (pending) listener(pending);
  return () => listeners.delete(listener);
}

export function consumeDaily() {
  pending = null;
}
