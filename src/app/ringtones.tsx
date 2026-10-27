import { StyleSheet, Text } from 'react-native';

import { CastSwitch } from '../components/CastSwitch';
import { C } from '../components/Neu';
import { Screen } from '../components/Screen';
import { ToneRow } from '../components/ToneRow';
import { castMembers } from '../data/girls';
import { useSettings } from '../lib/store';

export default function RingtonesScreen() {
  const members = castMembers(useSettings().cast);
  return (
    <Screen title="Ringtones" subtitle="Call and message tones with your name">
      <CastSwitch />
      <Text style={styles.section}>Phone ringtones</Text>
      {members.map((g) => (
        <ToneRow key={`call-${g.id}`} girlId={g.id} line="call" face="call" type="ringtone" label="Ringtone" />
      ))}
      <Text style={styles.section}>Message tones</Text>
      {members.map((g) => (
        <ToneRow key={`msg-${g.id}`} girlId={g.id} line="message" face="shy" type="notification" label="Message tone" />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12, marginTop: 4 },
});
