import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';

import { Face } from '../components/Face';
import { C, NeuButton, NeuCard } from '../components/Neu';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Emotion, EMOTIONS, findName, getGirl, GIRLS, GirlId, HONORIFICS, lineFor, suggestNames } from '../data/girls';
import { useBob, usePop } from '../lib/motion';
import { useSettings } from '../lib/store';
import { playLine, setTone, stopSpeaking } from '../lib/voice';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function GirlsScreen() {
  const { name, lang, honorific, reduceMotion, update } = useSettings();
  const toast = useToast();
  const [girlId, setGirlId] = useState<GirlId>('hana');
  const [emotion, setEmotion] = useState<Emotion>('love');
  const [talking, setTalking] = useState(false);
  const [error, setError] = useState('');
  const girl = getGirl(girlId);
  const pop = usePop(`${girlId}-${emotion}`, reduceMotion);
  const bob = useBob(talking, reduceMotion);
  const line = lineFor(girlId, emotion, lang, name, honorific);
  const known = findName(name, lang);
  const suggestions = suggestNames(name, lang);
  const hon = HONORIFICS.find((h) => h.key === honorific)!;

  useEffect(() => stopSpeaking, []);

  const play = (g: GirlId, e: Emotion) => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    setTalking(true);
    playLine(getGirl(g), e, lang, name, honorific, () => setTalking(false));
  };

  const onSetRingtone = async () => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    try {
      const msg = await setTone(girl, emotion, lang, name, honorific, 'ringtone', `${girl.name} - ${emotion}`);
      if (msg) toast(msg);
    } catch {
      toast("Couldn't set the tone. Try again.");
    }
  };

  return (
    <Screen
      title="Senpai says"
      subtitle="Pick a girl, then an emotion"
      right={
        <NeuButton onPress={() => update({ lang: lang === 'en' ? 'jp' : 'en' })} style={styles.lang} radius={12} depth={4} accessibilityLabel="Switch voice language">
          <Text style={styles.langText}>{lang === 'en' ? 'EN' : 'JP'}</Text>
        </NeuButton>
      }
    >
      <NeuCard pressed radius={16} depth={6} style={styles.inputWrap}>
        <Ionicons name="person-outline" size={18} color={C.muted} />
        <TextInput
          value={name}
          onChangeText={(t) => {
            setError('');
            update({ name: t });
          }}
          placeholder="Your name, like Baqar"
          placeholderTextColor={C.muted}
          style={styles.input}
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      </NeuCard>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {name.trim() ? (
        <Text style={styles.callHint}>
          {lang === 'jp'
            ? known
              ? `She calls you ${known.kana}${hon.jp}`
              : "This name isn't in the voice list yet, so she'll call you せんぱい (Senpai)"
            : known
              ? `She calls you ${name.trim()}${hon.en}`
              : "This name isn't in the English voice list yet, so she'll call you Senpai. Try the Japanese voice."}
        </Text>
      ) : null}
      {suggestions.length > 0 && (
        <View style={styles.suggestRow}>
          {suggestions.map((s) => (
            <NeuButton key={s.label} onPress={() => update({ name: s.label })} style={styles.suggest} radius={12} depth={3} accessibilityLabel={`Use name ${s.label}`}>
              <Text style={styles.suggestText}>
                {s.label} <Text style={styles.suggestKana}>{s.kana}</Text>
              </Text>
            </NeuButton>
          ))}
        </View>
      )}

      <NeuCard radius={28} depth={8} style={styles.hero}>
        <Animated.View style={{ transform: [{ scale: pop }, { translateY: bob }] }}>
          <View style={[styles.faceRing, { backgroundColor: girl.bg }]}>
            <Face girl={girl} emotion={emotion} size={150} />
          </View>
        </Animated.View>
        <Text style={[styles.who, { color: girl.fg }]}>
          {girl.name} · {girl.type}
        </Text>
        <Text style={styles.line}>{name.trim() ? `"${line.show}"` : 'Type your name to hear her say it'}</Text>
        {line.sub && name.trim() ? <Text style={styles.sub}>{line.sub}</Text> : null}
      </NeuCard>

      <View style={styles.grid}>
        {EMOTIONS.map((e) => (
          <NeuButton
            key={e.key}
            active={e.key === emotion}
            onPress={() => {
              setEmotion(e.key);
              play(girlId, e.key);
            }}
            style={styles.emo}
            accessibilityLabel={e.label}
          >
            <Ionicons name={e.icon as IconName} size={22} color={e.key === emotion ? C.accent : C.text} />
            <Text style={[styles.emoText, e.key === emotion && { color: C.accent }]}>{e.label}</Text>
          </NeuButton>
        ))}
      </View>

      <View style={styles.girls}>
        {GIRLS.map((g) => (
          <NeuButton
            key={g.id}
            active={g.id === girlId}
            onPress={() => {
              setGirlId(g.id);
              play(g.id, emotion);
            }}
            style={styles.girl}
            radius={20}
            accessibilityLabel={`${g.name}, ${g.type}`}
          >
            <Face girl={g} emotion="love" size={50} />
            <Text style={[styles.girlName, g.id === girlId && { color: g.fg }]}>{g.name}</Text>
          </NeuButton>
        ))}
      </View>

      <NeuButton onPress={onSetRingtone} style={styles.cta} radius={18} accessibilityLabel="Set this line as ringtone">
        <View style={styles.ctaRow}>
          <Ionicons name="notifications-outline" size={18} color={C.accent} />
          <Text style={styles.ctaText}>Set this line as ringtone</Text>
        </View>
      </NeuButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lang: { width: 48, height: 40 },
  langText: { fontWeight: '700', color: C.accent },
  inputWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, height: 48, fontSize: 16, color: C.text },
  error: { color: C.danger, fontSize: 13, marginTop: 6 },
  callHint: { color: C.muted, fontSize: 12, marginTop: 8, marginLeft: 4 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  suggest: { paddingHorizontal: 12, height: 34 },
  suggestText: { fontSize: 13, fontWeight: '600', color: C.text },
  suggestKana: { fontWeight: '400', color: C.muted },
  hero: { alignItems: 'center', padding: 20, marginTop: 22, marginBottom: 24 },
  faceRing: { borderRadius: 90, padding: 6 },
  who: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  line: { fontSize: 17, color: C.text, textAlign: 'center', marginTop: 6, lineHeight: 24 },
  sub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, marginBottom: 24 },
  emo: { width: 100, height: 72, gap: 4 },
  emoText: { fontSize: 12, color: C.text, fontWeight: '500' },
  girls: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  girl: { width: 74, paddingVertical: 10, gap: 4 },
  girlName: { fontSize: 12, fontWeight: '600', color: C.text },
  cta: { height: 54 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: C.accent, fontWeight: '700', fontSize: 15 },
});
