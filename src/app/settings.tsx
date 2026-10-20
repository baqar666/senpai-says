import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { C, NeuButton, NeuCard } from '../components/Neu';
import { Screen } from '../components/Screen';
import { HONORIFICS } from '../data/girls';
import { VOICE_CREDITS } from '../data/voice-assets';
import { useSettings } from '../lib/store';

export default function SettingsScreen() {
  const { name, lang, honorific, reduceMotion, update } = useSettings();
  return (
    <Screen title="Settings">
      <Text style={styles.label}>Your name</Text>
      <NeuCard pressed radius={16} depth={6} style={styles.inputWrap}>
        <TextInput
          value={name}
          onChangeText={(t) => update({ name: t })}
          placeholder="Your name, like Baqar"
          placeholderTextColor={C.muted}
          style={styles.input}
          maxLength={20}
        />
      </NeuCard>

      <Text style={styles.label}>She calls you</Text>
      <View style={styles.chips}>
        {HONORIFICS.map((h) => (
          <NeuButton key={h.key} active={honorific === h.key} onPress={() => update({ honorific: h.key })} style={styles.chip} radius={12} depth={3} accessibilityLabel={h.label}>
            <Text style={[styles.chipText, honorific === h.key && { color: C.accent }]}>{h.label}</Text>
          </NeuButton>
        ))}
      </View>

      <Text style={styles.label}>Voice</Text>
      <View style={styles.seg}>
        {(['en', 'jp'] as const).map((l) => (
          <NeuButton key={l} active={lang === l} onPress={() => update({ lang: l })} containerStyle={{ flex: 1 }} style={styles.segBtn} accessibilityLabel={l === 'en' ? 'English' : 'Japanese'}>
            <Text style={[styles.segText, lang === l && { color: C.accent }]}>{l === 'en' ? 'English voice' : 'Japanese anime voice'}</Text>
          </NeuButton>
        ))}
      </View>

      <NeuCard radius={18} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Reduce animations</Text>
          <Text style={styles.rowSub}>Smoother on older or slower phones</Text>
        </View>
        <Switch
          value={reduceMotion}
          onValueChange={(v) => update({ reduceMotion: v })}
          trackColor={{ false: C.dark, true: '#ED93B1' }}
          thumbColor={reduceMotion ? C.accent : '#fff'}
        />
      </NeuCard>

      <Text style={styles.footer}>
        Hana, Rei, Aiko, and Yui are original characters.{'\n'}Voices: {VOICE_CREDITS.join(', ')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 10, marginTop: 8 },
  inputWrap: { paddingHorizontal: 14, marginBottom: 20 },
  input: { height: 48, fontSize: 16, color: C.text },
  seg: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  segBtn: { height: 48 },
  segText: { fontWeight: '600', color: C.text, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  chip: { paddingHorizontal: 12, height: 38 },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 24 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  footer: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18 },
});
