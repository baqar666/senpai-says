import { ReactNode, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useSettings } from '../lib/store';
import { usePressScale } from '../lib/motion';

export const C = {
  base: '#ECE8F3',
  light: '#FFFFFF',
  dark: '#C9C2D8',
  text: '#3D3650',
  muted: '#7D7591',
  accent: '#D4537E',
  danger: '#A32D2D',
};

// Soft neumorphic shadows: a light one up-left, a dark one down-right.
const raised = (d: number) => `-${d}px -${d}px ${d * 2}px ${C.light}, ${d}px ${d}px ${d * 2}px ${C.dark}`;
const inset = (d: number) => `inset ${d}px ${d}px ${d * 2}px ${C.dark}, inset -${d}px -${d}px ${d * 2}px ${C.light}`;

export function NeuCard({
  children,
  pressed,
  depth = 6,
  radius = 20,
  style,
}: {
  children?: ReactNode;
  pressed?: boolean;
  depth?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ backgroundColor: C.base, borderRadius: radius, boxShadow: pressed ? inset(depth / 2) : raised(depth) }, style]}>
      {children}
    </View>
  );
}

export function NeuButton({
  children,
  onPress,
  active,
  depth = 5,
  radius = 16,
  style,
  containerStyle,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  active?: boolean;
  depth?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  // Layout for the outer pressable, e.g. flex: 1 inside a row.
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { reduceMotion } = useSettings();
  const { scale, onPressIn, onPressOut } = usePressScale(reduceMotion);
  const [down, setDown] = useState(false);
  return (
    <Pressable
      style={containerStyle}
      onPress={onPress}
      onPressIn={() => {
        setDown(true);
        onPressIn();
      }}
      onPressOut={() => {
        setDown(false);
        onPressOut();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}
    >
      <Animated.View
        style={[
          styles.btn,
          { borderRadius: radius, boxShadow: down || active ? inset(depth / 2) : raised(depth), transform: [{ scale }] },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: C.base, alignItems: 'center', justifyContent: 'center' },
});
