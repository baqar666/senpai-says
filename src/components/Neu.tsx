import { ReactNode, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { usePressScale } from '../lib/motion';
import { useSettings } from '../lib/store';
import { Palette, useColors } from '../lib/theme';

// Soft neumorphic shadows: a light one up-left, a dark one down-right (colours from the theme).
const raised = (c: Palette, d: number) => `-${d}px -${d}px ${d * 2}px ${c.light}, ${d}px ${d}px ${d * 2}px ${c.dark}`;
const inset = (c: Palette, d: number) => `inset ${d}px ${d}px ${d * 2}px ${c.dark}, inset -${d}px -${d}px ${d * 2}px ${c.light}`;

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
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.base, borderRadius: radius, boxShadow: pressed ? inset(c, depth / 2) : raised(c, depth) }, style]}>
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
  const c = useColors();
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
          { backgroundColor: c.base, borderRadius: radius, boxShadow: down || active ? inset(c, depth / 2) : raised(c, depth), transform: [{ scale }] },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
