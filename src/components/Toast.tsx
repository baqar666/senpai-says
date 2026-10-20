import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { useAnimatedValue } from '../lib/motion';
import { useSettings } from '../lib/store';
import { C, NeuCard } from './Neu';

const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { reduceMotion } = useSettings();
  const [msg, setMsg] = useState<string | null>(null);
  const v = useAnimatedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (m: string) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(v, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(v, { toValue: 0, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start(() => setMsg(null));
      }, 2200);
    },
    [reduceMotion, v]
  );

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
        >
          <NeuCard depth={5} radius={14} style={styles.card}>
            <Text style={styles.text}>{msg}</Text>
          </NeuCard>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 24, right: 24, bottom: 110, alignItems: 'center' },
  card: { paddingVertical: 12, paddingHorizontal: 18 },
  text: { color: C.text, fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
