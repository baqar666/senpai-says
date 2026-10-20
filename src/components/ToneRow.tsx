import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ToneType } from '../../modules/ringtone-setter';
import { Emotion, getGirl, GirlId, LineKey, lineFor } from '../data/girls';
import { useSettings } from '../lib/store';
import { playLine, setTone } from '../lib/voice';
import { Face } from './Face';
import { C, NeuButton, NeuCard } from './Neu';
import { useToast } from './Toast';

export function ToneRow({ girlId, line, face, type, label }: { girlId: GirlId; line: LineKey; face: Emotion; type: ToneType; label: string }) {
  const { name, lang, honorific } = useSettings();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const girl = getGirl(girlId);
  const l = lineFor(girlId, line, lang, name, honorific);

  const onSet = async () => {
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
      <NeuButton onPress={() => playLine(girl, line, lang, name, honorific)} style={styles.icon} radius={14} depth={3} accessibilityLabel={`Play ${girl.name} ${label}`}>
        <Ionicons name="play" size={16} color={C.accent} />
      </NeuButton>
      <NeuButton onPress={onSet} style={styles.set} radius={14} depth={3} accessibilityLabel={`Set ${girl.name} as ${label}`}>
        {busy ? <ActivityIndicator size="small" color={C.accent} /> : <Text style={styles.setText}>Set</Text>}
      </NeuButton>
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, marginBottom: 16 },
  mid: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600', color: C.text },
  line: { fontSize: 12, color: C.muted, marginTop: 2 },
  icon: { width: 38, height: 38 },
  set: { height: 38, paddingHorizontal: 14 },
  setText: { color: C.accent, fontWeight: '600', fontSize: 13 },
});
