import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// All animations use the native driver and only touch transform/opacity,
// so they keep running smoothly even when the JS thread is busy on slow phones.

// Stable Animated.Value (RN's useAnimatedValue isn't available on web).
export function useAnimatedValue(initial: number) {
  return useState(() => new Animated.Value(initial))[0];
}

export function usePressScale(reduce: boolean, to = 0.95) {
  const scale = useAnimatedValue(1);
  const go = (v: number) => {
    if (reduce) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  return { scale, onPressIn: () => go(to), onPressOut: () => go(1) };
}

// Small "pop" whenever `trigger` changes (e.g. a new emotion).
export function usePop(trigger: unknown, reduce: boolean) {
  const scale = useAnimatedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    scale.setValue(0.88);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }).start();
  }, [trigger, reduce, scale]);
  return scale;
}

// Gentle up-down bob while the girl is talking.
export function useBob(active: boolean, reduce: boolean) {
  const y = useAnimatedValue(0);
  useEffect(() => {
    if (!active || reduce) {
      y.stopAnimation();
      y.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -4, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, y]);
  return y;
}

// Fade and slide a screen in each time its tab is opened.
export function useEnter(reduce: boolean) {
  const v = useAnimatedValue(1);
  useFocusEffect(
    useCallback(() => {
      if (reduce) {
        v.setValue(1);
        return;
      }
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [reduce, v])
  );
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
}
