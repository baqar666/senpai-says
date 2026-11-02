import { StyleSheet, Text } from 'react-native';

import { CastSwitch } from '../components/CastSwitch';
import { Screen } from '../components/Screen';
import { ToneRow } from '../components/ToneRow';
import { castMembers, LineKey } from '../data/girls';
import { useSettings } from '../lib/store';
import { themed } from '../lib/theme';
import { lineAvailable } from '../lib/voice';

const WAKE_LINES: LineKey[] = ['morning', 'morning2', 'morning3'];

export default function AlarmScreen() {
  const styles = useStyles();
  const { cast, lang } = useSettings();
  const members = castMembers(cast);
  return (
    <Screen title="Alarm" subtitle="Wake up to a voice saying your name">
      <CastSwitch />
      <Text style={styles.note}>Sets the default sound for alarms in your phone&apos;s clock app.</Text>
      {members.flatMap((g) =>
        WAKE_LINES.filter((line) => lineAvailable(g, line, lang)).map((line, i) => (
          <ToneRow key={`${g.id}-${line}`} girlId={g.id} line={line} face="love" type="alarm" label={`Wake-up ${i + 1}`} />
        ))
      )}
    </Screen>
  );
}

const useStyles = themed((C) =>
  StyleSheet.create({
  note: { fontSize: 13, color: C.muted, marginBottom: 16 },
})
);
