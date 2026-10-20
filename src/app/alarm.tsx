import { StyleSheet, Text } from 'react-native';

import { C } from '../components/Neu';
import { Screen } from '../components/Screen';
import { ToneRow } from '../components/ToneRow';
import { GIRLS } from '../data/girls';

export default function AlarmScreen() {
  return (
    <Screen title="Alarm" subtitle="Wake up to her voice">
      <Text style={styles.note}>Sets the default sound for alarms in your phone&apos;s clock app.</Text>
      {GIRLS.map((g) => (
        <ToneRow key={g.id} girlId={g.id} line="morning" face="love" type="alarm" label="Wake-up" />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.muted, marginBottom: 16 },
});
