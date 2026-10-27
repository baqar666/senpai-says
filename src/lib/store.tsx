import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { Cast, Honorific, Lang } from '../data/girls';
import { GUARD_APPS, GuardAppId } from './guard';

type Settings = {
  name: string;
  lang: Lang;
  honorific: Honorific;
  reduceMotion: boolean;
  dailyOn: boolean;
  dailyHour: number;
  guardOn: boolean;
  guardLimit: number;
  guardApps: GuardAppId[];
  cast: Cast;
};
type Store = Settings & { ready: boolean; update: (patch: Partial<Settings>) => void };

const KEY = 'senpai-says/settings';
const DEFAULTS: Settings = {
  name: '',
  lang: 'jp',
  honorific: 'kun',
  reduceMotion: false,
  dailyOn: false,
  dailyHour: 9,
  guardOn: false,
  guardLimit: 60,
  guardApps: GUARD_APPS.map((a) => a.id),
  cast: 'girls',
};
const Ctx = createContext<Store | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Default "reduce animations" to the phone's own accessibility setting.
      const sysReduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      const saved = await AsyncStorage.getItem(KEY).catch(() => null);
      setS({ ...DEFAULTS, reduceMotion: sysReduce, ...(saved ? JSON.parse(saved) : null) });
      setReady(true);
    })();
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...s,
      ready,
      update: (patch) =>
        setS((prev) => {
          const next = { ...prev, ...patch };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [s, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used inside SettingsProvider');
  return v;
}
