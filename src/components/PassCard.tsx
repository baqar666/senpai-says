import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { privacyOptionsRequired, showPrivacyOptions } from '../lib/ads';
import { usePass } from '../lib/pass';
import { C, NeuButton, NeuCard } from './Neu';
import { useToast } from './Toast';

// Settings: Senpai Pass status, buy, restore, and (where required) ad privacy choices.
export function PassCard() {
  const { pro, price, openPaywall, restore } = usePass();
  const toast = useToast();
  const [restoring, setRestoring] = useState(false);
  const [adChoices, setAdChoices] = useState(false);

  useEffect(() => {
    if (!pro) privacyOptionsRequired().then(setAdChoices).catch(() => {});
  }, [pro]);

  const onRestore = async () => {
    setRestoring(true);
    const r = await restore();
    setRestoring(false);
    toast(r === 'restored' ? 'Senpai Pass restored 💖' : r === 'none' ? 'No Senpai Pass found on this Google account.' : "Couldn't reach Google Play. Try again.");
  };

  return (
    <>
      <NeuCard radius={18} style={styles.card}>
        <View style={styles.head}>
          <Ionicons name={pro ? 'sparkles' : 'sparkles-outline'} size={22} color={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{pro ? 'Senpai Pass · active' : 'Senpai Pass'}</Text>
            <Text style={styles.sub}>
              {pro ? 'Everything unlocked, no ads. Thank you!' : 'All ringtones, special moments, full screen-time guard, no ads'}
            </Text>
          </View>
        </View>
        {!pro && (
          <NeuButton onPress={() => openPaywall()} style={styles.get} radius={14} depth={4} accessibilityLabel="Get Senpai Pass">
            <Text style={styles.getText}>Get Senpai Pass{price ? ` · ${price}` : ''}</Text>
          </NeuButton>
        )}
        <NeuButton onPress={() => restoring || onRestore()} style={styles.restore} radius={12} depth={2} accessibilityLabel="Restore purchase">
          {restoring ? <ActivityIndicator color={C.muted} /> : <Text style={styles.restoreText}>Restore purchase</Text>}
        </NeuButton>
      </NeuCard>
      {adChoices && (
        <NeuButton onPress={() => showPrivacyOptions()} style={styles.adChoices} radius={14} depth={3} accessibilityLabel="Ad privacy choices">
          <Text style={styles.restoreText}>Ad privacy choices</Text>
        </NeuButton>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, marginBottom: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  get: { height: 46 },
  getText: { fontSize: 14, fontWeight: '800', color: C.accent },
  restore: { height: 38 },
  restoreText: { fontSize: 13, fontWeight: '600', color: C.muted },
  adChoices: { height: 42, marginTop: -12, marginBottom: 24 },
});
