import { ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEnter } from '../lib/motion';
import { useSettings } from '../lib/store';
import { themed } from '../lib/theme';

export function Screen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  const styles = useStyles();
  const { reduceMotion } = useSettings();
  const enter = useEnter(reduceMotion);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Animated.View style={enter}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </Animated.View>
    </ScrollView>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base },
  content: { paddingHorizontal: 20, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 2 },
})
);
