import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ToneType } from '../../modules/ringtone-setter';
import { Emotion, getGirl, GirlId, LineKey, lineFor } from '../data/girls';
import { FREE_TONE_CHARACTERS, usePass } from '../lib/pass';
import { useSettings } from '../lib/store';
import { themed, useColors } from '../lib/theme';
import { playLine, setTone, stopSpeaking } from '../lib/voice';
import { Face } from './Face';
import { NeuButton, NeuCard } from './Neu';
import { useToast } from './Toast';

export function ToneRow({ girlId, line, face, type, label }: { girlId: GirlId; line: LineKey; face: Emotion; type: ToneType; label: string }) {
  const C = useColors();
  const styles = useStyles();
  const { name, lang, honorific } = useSettings();
  const toast = useToast();
  const { pro, gate } = usePass();
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const girl = getGirl(girlId);
  const l = lineFor(girlId, line, lang, name, honorific);

  // Starting another row stops this one, and playLine calls onEnd then too.
  const onPlay = () => {
    if (playing) return stopSpeaking();
    setPlaying(true);
    playLine(girl, line, lang, name, honorific, () => setPlaying(false));
  };

  const locked = !pro && !FREE_TONE_CHARACTERS.includes(girlId);
  const onSet = () =>
    locked ? gate({ title: `Set ${girl.name} as your ${label.toLowerCase()}`, allowAd: true, action: setNow }) : setNow();

  const setNow = async () => {
    setBusy(true);
    try {
      const msg = await setTone(girl, line, lang, name, honorific, type, `${girl.name} - ${label}`);
      if (msg) toast(msg);
    } catch {
      toast("Couldn't set the tone. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <NeuCard style={styles.row} radius={18}>
      <Face girl={girl} emotion={face} size={46} />
      <View style={styles.mid}>
        <Text style={styles.title}>
          {girl.name} · {label}
        </Text>
        <Text style={styles.line} numberOfLines={1}>
          {l.show}
        </Text>
      </View>
      <NeuButton
        onPress={onPlay}
        style={styles.icon}
        radius={14}
        depth={3}
        accessibilityLabel={`${playing ? 'Stop' : 'Play'} ${girl.name} ${label}`}>
        <Ionicons name={playing ? 'stop' : 'play'} size={16} color={C.accent} />
      </NeuButton>
      <NeuButton onPress={onSet} style={styles.set} radius={14} depth={3} accessibilityLabel={`Set ${girl.name} as ${label}`}>
        {busy ? (
          <ActivityIndicator size="small" color={C.accent} />
        ) : (
          <View style={styles.setRow}>
            {locked && <Ionicons name="lock-closed" size={12} color={C.accent} />}
            <Text style={styles.setText}>Set</Text>
          </View>
        )}
      </NeuButton>
    </NeuCard>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, marginBottom: 16 },
  mid: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600', color: C.text },
  line: { fontSize: 12, color: C.muted, marginTop: 2 },
  icon: { width: 38, height: 38 },
  set: { height: 38, paddingHorizontal: 14 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  setText: { color: C.accent, fontWeight: '600', fontSize: 13 },
})
);
