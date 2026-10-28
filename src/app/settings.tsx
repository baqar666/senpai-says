import { Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { GuardSettings } from '../components/GuardSettings';
import { NeuButton, NeuCard } from '../components/Neu';
import { PassCard } from '../components/PassCard';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { HONORIFICS } from '../data/girls';
import { VOICE_CREDITS } from '../data/voice-assets';
import { scheduleDaily } from '../lib/daily';
import { useSettings } from '../lib/store';
import { themed, useColors } from '../lib/theme';

const THEMES = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const;

const DAILY_TIMES = [
  { hour: 8, label: 'Morning' },
  { hour: 13, label: 'Afternoon' },
  { hour: 21, label: 'Night' },
];

export default function SettingsScreen() {
  const C = useColors();
  const styles = useStyles();
  const { name, lang, honorific, reduceMotion, dailyOn, dailyHour, cast, theme, update } = useSettings();
  const toast = useToast();

  const toggleDaily = async (on: boolean) => {
    update({ dailyOn: on });
    if (!on || Platform.OS === 'web') return;
    const result = await scheduleDaily({ enabled: true, hour: dailyHour, name, lang, honorific, cast });
    if (result === 'denied') {
      update({ dailyOn: false });
      toast('Turn on notifications for Senpai Says in your phone settings first.');
    } else if (result === 'scheduled') {
      toast('Daily messages are on 💌');
    }
  };
  return (
    <Screen title="Settings">
      <PassCard />
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

      <Text style={styles.label}>{cast === 'boys' ? 'He calls you' : 'She calls you'}</Text>
      <View style={styles.chips}>
        {HONORIFICS.map((h) => (
          <NeuButton key={h.key} active={honorific === h.key} onPress={() => update({ honorific: h.key })} style={styles.chip} radius={12} depth={3} accessibilityLabel={h.label}>
            <Text style={[styles.chipText, honorific === h.key && { color: C.accent }]}>{h.label}</Text>
          </NeuButton>
        ))}
      </View>

      <Text style={styles.label}>Appearance</Text>
      <View style={styles.seg}>
        {THEMES.map((t) => (
          <NeuButton key={t.key} active={theme === t.key} onPress={() => update({ theme: t.key })} containerStyle={{ flex: 1 }} style={styles.segBtn} accessibilityLabel={`${t.label} appearance`}>
            <Text style={[styles.segText, theme === t.key && { color: C.accent }]}>{t.label}</Text>
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
          <Text style={styles.rowTitle}>Daily message</Text>
          <Text style={styles.rowSub}>A new line from one of the {cast} every day</Text>
        </View>
        <Switch
          value={dailyOn}
          onValueChange={toggleDaily}
          trackColor={{ false: C.dark, true: C.track }}
          thumbColor={dailyOn ? C.accent : '#fff'}
        />
      </NeuCard>
      {dailyOn && (
        <View style={[styles.chips, { marginTop: -8 }]}>
          {DAILY_TIMES.map((t) => (
            <NeuButton
              key={t.hour}
              active={dailyHour === t.hour}
              onPress={() => update({ dailyHour: t.hour })}
              style={styles.chip}
              radius={12}
              depth={3}
              accessibilityLabel={`${t.label} daily message`}
            >
              <Text style={[styles.chipText, dailyHour === t.hour && { color: C.accent }]}>{t.label}</Text>
            </NeuButton>
          ))}
        </View>
      )}

      <GuardSettings />

      <NeuCard radius={18} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Reduce animations</Text>
          <Text style={styles.rowSub}>Smoother on older or slower phones</Text>
        </View>
        <Switch
          value={reduceMotion}
          onValueChange={(v) => update({ reduceMotion: v })}
          trackColor={{ false: C.dark, true: C.track }}
          thumbColor={reduceMotion ? C.accent : '#fff'}
        />
      </NeuCard>

      <Text style={styles.footer}>
        Hana, Rei, Aiko, Yui, Kaito, Ryuga, Jin, and Haru are original characters.{'\n'}Voices: {VOICE_CREDITS.join(', ')}
      </Text>
    </Screen>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
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
})
);
