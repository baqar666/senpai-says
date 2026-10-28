import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { castMembers, getGirl } from '../data/girls';
import { usePass } from '../lib/pass';
import { useSettings } from '../lib/store';
import { themed, useColors } from '../lib/theme';
import { playLine } from '../lib/voice';
import { Face } from './Face';
import { NeuButton, NeuCard } from './Neu';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const PRIVACY_URL = 'https://baqar666.github.io/privacy-policies/senpai-says/';

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'notifications-outline', text: 'Set any character as your ringtone, message tone or alarm' },
  { icon: 'gift-outline', text: 'Every special moment: birthday, Eid, exam luck, gym and more' },
  { icon: 'phone-portrait-outline', text: 'Full "Stop me scrolling": every app, any limit' },
  { icon: 'heart-outline', text: 'No ads, ever' },
  { icon: 'sparkles-outline', text: 'Every new character we add' },
];

const MESSAGE: Record<string, string> = {
  pending: "Payment pending. The Pass unlocks by itself as soon as Google Play confirms it.",
  unavailable: "Purchases aren't available right now. Check your connection and Google Play, then try again.",
  error: 'Something went wrong. You were not charged. Please try again.',
  none: 'No Senpai Pass found on this Google account.',
  restoreError: "Couldn't reach Google Play to restore. Try again in a moment.",
};

// The Senpai Pass screen: what it unlocks, the real Play price, buy, restore.
export function Paywall() {
  const C = useColors();
  const styles = useStyles();
  const { paywall, closePaywall, pro, price, available, buy, restore, ready } = usePass();
  const { name, lang, honorific, cast } = useSettings();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState('');
  const members = castMembers(cast);
  const thanker = getGirl(members[0].id);

  const close = () => {
    setMessage('');
    closePaywall();
  };

  const onBuy = async () => {
    setBusy('buy');
    setMessage('');
    const r = await buy();
    setBusy(null);
    if (r === 'bought') {
      if (name.trim()) playLine(thanker, 'thanks', lang, name, honorific);
    } else if (r !== 'cancelled') {
      setMessage(MESSAGE[r]);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    setMessage('');
    const r = await restore();
    setBusy(null);
    if (r === 'none') setMessage(MESSAGE.none);
    if (r === 'error') setMessage(MESSAGE.restoreError);
  };

  return (
    <Modal visible={paywall.open} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <NeuButton onPress={close} style={styles.close} radius={14} depth={3} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={C.muted} />
        </NeuButton>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.faces}>
            {members.map((g) => (
              <Face key={g.id} girl={g} emotion={pro ? 'love' : 'call'} size={62} />
            ))}
          </View>

          {pro ? (
            <>
              <Text style={styles.title}>Thank you! 💖</Text>
              <Text style={styles.subtitle}>Senpai Pass is yours forever. Everything is unlocked.</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Senpai Pass</Text>
              <Text style={styles.subtitle}>One payment. Yours forever.</Text>
              {paywall.reason ? <Text style={styles.reason}>{paywall.reason}</Text> : null}
            </>
          )}

          <NeuCard radius={22} style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p.text} style={styles.perk}>
                <Ionicons name={pro ? 'checkmark-circle' : p.icon} size={20} color={pro ? '#1D9E75' : C.accent} />
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </NeuCard>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {pro ? (
            <NeuButton onPress={close} containerStyle={styles.full} style={styles.buy} radius={18} depth={6} accessibilityLabel="Done">
              <Text style={styles.buyText}>Done</Text>
            </NeuButton>
          ) : (
            <>
              <NeuButton
                onPress={() => busy || !available || onBuy()}
                containerStyle={styles.full}
                style={styles.buy}
                radius={18}
                depth={6}
                accessibilityLabel={price ? `Get Senpai Pass for ${price}` : 'Get Senpai Pass'}
              >
                {busy === 'buy' ? (
                  <ActivityIndicator color={C.accent} />
                ) : (
                  <Text style={styles.buyText}>
                    {available && price ? `Get Senpai Pass · ${price}` : ready ? 'Not available right now' : 'Loading price…'}
                  </Text>
                )}
              </NeuButton>
              <NeuButton onPress={() => busy || onRestore()} containerStyle={styles.full} style={styles.restore} radius={14} depth={3} accessibilityLabel="Restore purchase">
                {busy === 'restore' ? <ActivityIndicator color={C.muted} /> : <Text style={styles.restoreText}>Restore purchase</Text>}
              </NeuButton>
            </>
          )}

          <Text style={styles.fine}>
            One-time purchase, not a subscription. Paid through Google Play; restore it on any phone with the same Google
            account.{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
              Privacy policy
            </Text>
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.base, paddingHorizontal: 20 },
  close: { width: 40, height: 40, alignSelf: 'flex-end' },
  body: { alignItems: 'center', paddingBottom: 12 },
  faces: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, textAlign: 'center' },
  reason: { fontSize: 13, color: C.accent, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  perks: { alignSelf: 'stretch', padding: 18, gap: 14, marginTop: 22, marginBottom: 18 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkText: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },
  message: { fontSize: 13, color: C.danger, textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  full: { alignSelf: 'stretch' },
  buy: { height: 56 },
  buyText: { fontSize: 16, fontWeight: '800', color: C.accent },
  restore: { height: 44, marginTop: 14 },
  restoreText: { fontSize: 14, fontWeight: '600', color: C.muted },
  fine: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  link: { color: C.accent, textDecorationLine: 'underline' },
})
);
