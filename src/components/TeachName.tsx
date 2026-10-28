import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { suggestReading, teachName, TeachResult, validReading } from '../lib/customNames';
import { themed, useColors } from '../lib/theme';
import { NeuButton, NeuCard } from './Neu';

const MESSAGES: Record<Exclude<TeachResult, 'ok'>, string> = {
  invalid: 'Use katakana only (up to 20), like ザルヴィシュ.',
  offline: "Couldn't reach the voice studio. Check your connection and try again.",
  busy: 'Too many names from this phone for now. Try again in an hour.',
  unavailable: 'Teaching new names isn\'t available in this version yet.',
  error: 'Something went wrong. Please try again.',
};

// "Teach them your name": downloads every character saying a name that isn't built in.
// Mounted only while open, so it starts from a fresh suggested reading each time.
export function TeachName({ name, onClose, onTaught }: { name: string; onClose: () => void; onTaught: () => void }) {
  const C = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [reading, setReading] = useState(() => suggestReading(name));
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [message, setMessage] = useState('');

  const close = () => {
    if (!busy) onClose();
  };

  const download = async () => {
    if (busy) return;
    if (!validReading(reading)) return setMessage(MESSAGES.invalid);
    setBusy(true);
    setMessage('');
    // A sleeping free server takes a while to wake; say so instead of looking stuck.
    const timer = setTimeout(() => setSlow(true), 12_000);
    const result = await teachName(name, reading);
    clearTimeout(timer);
    setBusy(false);
    setSlow(false);
    if (result === 'ok') {
      onClose();
      onTaught();
    } else {
      setMessage(MESSAGES[result]);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <View style={styles.kickerRow}>
            <Ionicons name="mic-outline" size={18} color={C.accent} />
            <Text style={styles.kicker}>Teach them your name</Text>
          </View>
          <Text style={styles.title}>How should &ldquo;{name.trim()}&rdquo; sound?</Text>
          <Text style={styles.sub}>This is how the characters will say it in Japanese. Change it if it doesn&apos;t sound right.</Text>
          <NeuCard pressed radius={16} depth={6} style={styles.inputWrap}>
            <TextInput
              value={reading}
              onChangeText={(t) => {
                setMessage('');
                setReading(t.trim());
              }}
              placeholder="カタカナ"
              placeholderTextColor={C.muted}
              style={styles.input}
              maxLength={20}
              autoCorrect={false}
              editable={!busy}
              accessibilityLabel="Name reading in katakana"
            />
          </NeuCard>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <NeuButton onPress={download} style={styles.btn} radius={16} depth={5} accessibilityLabel="Download their voices">
            {busy ? (
              <View style={styles.row}>
                <ActivityIndicator color={C.accent} />
                <Text style={styles.btnText}>{slow ? 'Waking up the voice studio…' : 'Recording 32 voice clips…'}</Text>
              </View>
            ) : (
              <View style={styles.row}>
                <Ionicons name="download-outline" size={20} color={C.accent} />
                <Text style={styles.btnText}>Download their voices · 150 KB</Text>
              </View>
            )}
          </NeuButton>
          <Text style={styles.fine}>
            Only the reading above is sent, to make the audio. It isn&apos;t stored. Once downloaded, it works offline.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(30,24,44,0.35)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.base, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 12 },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    kicker: { fontSize: 13, fontWeight: '700', color: C.accent },
    title: { fontSize: 19, fontWeight: '700', color: C.text },
    sub: { fontSize: 13, color: C.muted, lineHeight: 18 },
    inputWrap: { paddingHorizontal: 16, marginTop: 4 },
    input: { height: 54, fontSize: 22, fontWeight: '600', color: C.text, letterSpacing: 1 },
    message: { fontSize: 13, color: C.danger, lineHeight: 18 },
    btn: { height: 54, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnText: { fontSize: 15, fontWeight: '700', color: C.accent },
    fine: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16 },
  })
);
