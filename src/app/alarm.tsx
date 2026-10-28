import { StyleSheet, Text } from 'react-native';

import { CastSwitch } from '../components/CastSwitch';
import { Screen } from '../components/Screen';
import { ToneRow } from '../components/ToneRow';
import { castMembers } from '../data/girls';
import { useSettings } from '../lib/store';
import { themed } from '../lib/theme';

export default function AlarmScreen() {
  const styles = useStyles();
  const members = castMembers(useSettings().cast);
  return (
    <Screen title="Alarm" subtitle="Wake up to a voice saying your name">
      <CastSwitch />
      <Text style={styles.note}>Sets the default sound for alarms in your phone&apos;s clock app.</Text>
      {members.map((g) => (
        <ToneRow key={g.id} girlId={g.id} line="morning" face="love" type="alarm" label="Wake-up" />
      ))}
    </Screen>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
  note: { fontSize: 13, color: C.muted, marginBottom: 16 },
})
);
