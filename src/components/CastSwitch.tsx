import { StyleSheet, Text, View } from 'react-native';

import { CASTS } from '../data/girls';
import { useSettings } from '../lib/store';
import { C, NeuButton } from './Neu';

// Girls / Boys: which group the app shows. Shared by the character, ringtone and alarm screens.
export function CastSwitch() {
  const { cast, update } = useSettings();
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {CASTS.map((c) => (
        <NeuButton
          key={c.key}
          active={cast === c.key}
          onPress={() => update({ cast: c.key })}
          containerStyle={{ flex: 1 }}
          style={styles.btn}
          radius={14}
          depth={4}
          accessibilityLabel={`Show ${c.label}`}
        >
          <Text style={[styles.text, cast === c.key && { color: C.accent }]}>{c.label}</Text>
        </NeuButton>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  btn: { height: 42 },
  text: { fontSize: 14, fontWeight: '700', color: C.text },
});
