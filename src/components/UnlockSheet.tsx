import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adsEnabled, showRewardedAd } from '../lib/ads';
import { usePass } from '../lib/pass';
import { themed, useColors } from '../lib/theme';
import { NeuButton } from './Neu';

// Shown when a free user taps something in the Senpai Pass: watch an ad to do it once, or get the Pass.
export function UnlockSheet() {
  const C = useColors();
  const styles = useStyles();
  const { unlockRequest: req, closeUnlock, openPaywall, price } = usePass();
  const insets = useSafeAreaInsets();
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState('');
  const canWatch = !!req?.allowAd && adsEnabled;

  const close = () => {
    setMessage('');
    closeUnlock();
  };

  const watch = async () => {
    if (!req || watching) return;
    setWatching(true);
    setMessage('');
    const r = await showRewardedAd();
    setWatching(false);
    if (r === 'rewarded') {
      close();
      req.action();
    } else if (r === 'skipped') {
      setMessage('Watch the ad to the end to unlock it.');
    } else {
      setMessage('No ad available right now. Try again in a bit, or get the Senpai Pass.');
    }
  };

  const getPass = () => {
    const title = req?.title;
    close();
    openPaywall(title);
  };

  return (
    <Modal visible={!!req} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <View style={styles.lockRow}>
            <Ionicons name="lock-closed" size={18} color={C.accent} />
            <Text style={styles.kicker}>Senpai Pass</Text>
          </View>
          <Text style={styles.title}>{req?.title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {canWatch && (
            <NeuButton onPress={watch} style={styles.btn} radius={16} depth={5} accessibilityLabel="Watch a short ad to unlock this once">
              {watching ? (
                <ActivityIndicator color={C.accent} />
              ) : (
                <View style={styles.row}>
                  <Ionicons name="play-circle-outline" size={20} color={C.accent} />
                  <Text style={styles.btnText}>Watch a short ad · unlock once</Text>
                </View>
              )}
            </NeuButton>
          )}
          <NeuButton onPress={getPass} style={styles.btn} radius={16} depth={5} accessibilityLabel="Get Senpai Pass">
            <View style={styles.row}>
              <Ionicons name="sparkles-outline" size={20} color={C.accent} />
              <Text style={styles.btnText}>Get Senpai Pass{price ? ` · ${price}` : ''}</Text>
            </View>
          </NeuButton>
          <NeuButton onPress={close} style={styles.later} radius={14} depth={2} accessibilityLabel="Not now">
            <Text style={styles.laterText}>Not now</Text>
          </NeuButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,24,44,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.base, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 14 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontSize: 13, fontWeight: '700', color: C.accent },
  title: { fontSize: 19, fontWeight: '700', color: C.text, marginBottom: 4 },
  message: { fontSize: 13, color: C.danger, lineHeight: 18 },
  btn: { height: 54 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700', color: C.accent },
  later: { height: 42 },
  laterText: { fontSize: 14, fontWeight: '600', color: C.muted },
})
);
