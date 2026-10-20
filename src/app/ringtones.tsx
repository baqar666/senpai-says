import { StyleSheet, Text } from 'react-native';

import { C } from '../components/Neu';
import { Screen } from '../components/Screen';
import { ToneRow } from '../components/ToneRow';
import { GIRLS } from '../data/girls';

export default function RingtonesScreen() {
  return (
    <Screen title="Ringtones" subtitle="Call and message tones with your name">
      <Text style={styles.section}>Phone ringtones</Text>
      {GIRLS.map((g) => (
        <ToneRow key={`call-${g.id}`} girlId={g.id} line="call" face="call" type="ringtone" label="Ringtone" />
      ))}
      <Text style={styles.section}>Message tones</Text>
      {GIRLS.map((g) => (
        <ToneRow key={`msg-${g.id}`} girlId={g.id} line="message" face="shy" type="notification" label="Message tone" />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12, marginTop: 4 },
});
