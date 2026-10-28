import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RingtoneSetter, { GuardTrigger } from '../../modules/ringtone-setter';
import { getGirl, GuardLine, lineFor } from '../data/girls';
import { GUARD_VIDEOS } from '../data/guard-videos';
import { appLabel, guardGirl, SNOOZE_MINUTES, useGuardTrigger, VOICE_START } from '../lib/guard';
import { useSettings } from '../lib/store';
import { ForceLight, LIGHT as C } from '../lib/theme';
import { lineAvailable, playLine, stopSpeaking } from '../lib/voice';
import { Face } from './Face';
import { NeuButton, NeuCard } from './Neu';

// Shown when the screen-time guard brings the app over Instagram & co.
export function GuardOverlay() {
  const [trigger, clear] = useGuardTrigger();
  if (!trigger) return null;
  return (
    <ForceLight>
      <Warning key={`${trigger.level}-${trigger.pkg}`} trigger={trigger} onDone={clear} />
    </ForceLight>
  );
}

function Warning({ trigger, onDone }: { trigger: GuardTrigger; onDone: () => void }) {
  const { name, lang: chosenLang, honorific, cast } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const girl = getGirl(guardGirl(trigger.level, cast));
  const key: GuardLine = trigger.level <= 1 ? 'rest' : 'rest2';
  // English clips for new lines can lag behind the Japanese ones; fall back rather than stay silent.
  const lang = lineAvailable(girl, key, chosenLang) ? chosenLang : 'jp';
  const line = lineFor(girl.id, key, lang, name, honorific);
  const used = useMemo(() => RingtoneSetter?.guardStatus().usedMinutes ?? 0, []);
  const video = GUARD_VIDEOS[girl.id];
  const player = useVideoPlayer(video ?? null, (p) => {
    p.muted = true;
  });

  // The video doesn't loop by itself: every time it starts (first load, then each time it ends) we
  // play it from the top and she speaks when her mouth starts moving in the clip.
  useEffect(() => {
    // Long lines (some English ones) outlast a loop: let her finish rather than restart mid-sentence.
    let speaking = false;
    const speak = () => {
      if (speaking) return;
      speaking = true;
      playLine(girl, key, lang, name, honorific, () => (speaking = false));
    };
    let voiceTimer: ReturnType<typeof setTimeout> | undefined;
    let started = false;
    const start = () => {
      started = true;
      player.play();
      clearTimeout(voiceTimer);
      voiceTimer = setTimeout(speak, VOICE_START[girl.id] * 1000);
    };
    const ready = player.addListener('statusChange', ({ status }) => status === 'readyToPlay' && !started && start());
    const ended = player.addListener('playToEnd', () => {
      player.replay();
      start();
    });
    if (player.status === 'readyToPlay') start();
    // A girl without a video repeats every 6 seconds, like the animations.
    const interval = video ? undefined : setInterval(speak, 6_000);
    if (!video) speak();
    return () => {
      ready.remove();
      ended.remove();
      clearTimeout(voiceTimer);
      clearInterval(interval);
      stopSpeaking();
    };
  }, [player, video, girl, key, lang, name, honorific]);

  const rest = () => {
    stopSpeaking();
    onDone();
    RingtoneSetter?.goHome();
  };
  const snooze = () => {
    stopSpeaking();
    onDone();
    RingtoneSetter?.snoozeGuard(SNOOZE_MINUTES);
  };

  const size = Math.min(width - 48, 380);
  const hours = used >= 60 ? `${Math.floor(used / 60)} h ${used % 60 ? `${used % 60} min` : ''}`.trim() : `${used} min`;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={snooze}>
      <View style={[styles.wrap, { backgroundColor: girl.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.badge, { color: girl.fg }]}>
          {hours} on {appLabel(trigger.pkg)} today
        </Text>
        <NeuCard radius={32} depth={10} style={[styles.stage, { width: size, height: size, backgroundColor: girl.bg }]}>
          {video ? (
            <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} surfaceType="textureView" />
          ) : (
            <Face girl={girl} emotion={key === 'rest' ? 'miss' : 'angry'} size={size - 40} />
          )}
        </NeuCard>
        <Text style={[styles.who, { color: girl.fg }]}>{girl.name}</Text>
        <Text style={styles.line}>“{line.show}”</Text>
        {!!line.sub && <Text style={styles.sub}>{line.sub}</Text>}
        <View style={styles.buttons}>
          <NeuButton onPress={rest} style={styles.primary} radius={18} depth={5} accessibilityLabel="OK, I'll take a break">
            <Text style={styles.primaryText}>OK, I&apos;ll rest 💤</Text>
          </NeuButton>
          <NeuButton onPress={snooze} style={styles.secondary} radius={18} depth={3} accessibilityLabel={`${SNOOZE_MINUTES} more minutes`}>
            <Text style={styles.secondaryText}>{SNOOZE_MINUTES} more minutes…</Text>
          </NeuButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  badge: { fontSize: 13, fontWeight: '700', marginBottom: 20, opacity: 0.8 },
  stage: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  who: { fontSize: 15, fontWeight: '700', marginTop: 22 },
  line: { fontSize: 20, fontWeight: '600', color: C.text, textAlign: 'center', marginTop: 8, lineHeight: 28 },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
  buttons: { alignSelf: 'stretch', gap: 14, marginTop: 28 },
  primary: { height: 54 },
  primaryText: { fontSize: 16, fontWeight: '700', color: C.accent },
  secondary: { height: 46 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: C.muted },
});
