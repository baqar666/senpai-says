import { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { Girl } from '../data/girls';
import { useSettings } from './store';

// Neumorphic palettes: `light` and `dark` are the two shadow colours around a raised surface.
export const LIGHT = {
  base: '#ECE8F3',
  light: '#FFFFFF',
  dark: '#C9C2D8',
  text: '#3D3650',
  muted: '#7D7591',
  accent: '#D4537E',
  danger: '#A32D2D',
  track: '#ED93B1',
};

export const DARK: Palette = {
  base: '#24202D',
  light: '#302B3B',
  dark: '#15121B',
  text: '#EDE9F5',
  muted: '#A49DB8',
  accent: '#F07AA3',
  danger: '#FF8A8A',
  track: '#8E3F5E',
};

export type Palette = typeof LIGHT;
export type ThemeChoice = 'system' | 'light' | 'dark';

type Theme = { c: Palette; dark: boolean };
const Ctx = createContext<Theme>({ c: LIGHT, dark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useSettings();
  const system = useColorScheme();
  const dark = theme === 'dark' || (theme === 'system' && system === 'dark');
  const value = useMemo(() => ({ c: dark ? DARK : LIGHT, dark }), [dark]);
  // The window behind the app (shown while screens load or the keyboard opens).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(value.c.base).catch(() => {});
  }, [value]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const LIGHT_THEME: Theme = { c: LIGHT, dark: false };

// For screens drawn on a character's pastel colour (the screen-time warning): always the light palette.
export function ForceLight({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={LIGHT_THEME}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
export const useColors = () => useContext(Ctx).c;

// Turns a style factory into a hook; styles are built once per palette, so theme switches stay cheap.
export function themed<T>(factory: (c: Palette) => T): () => T {
  const cache = new Map<Palette, T>();
  return () => {
    const c = useColors();
    let styles = cache.get(c);
    if (!styles) {
      styles = factory(c);
      cache.set(c, styles);
    }
    return styles;
  };
}

// Character names use each character's dark colour; on the dark theme their pastel reads better.
export const nameColor = (girl: Girl, dark: boolean) => (dark ? girl.bg : girl.fg);
