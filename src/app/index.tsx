import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Face } from '../components/Face';
import { C, NeuButton, NeuCard } from '../components/Neu';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { CastSwitch } from '../components/CastSwitch';
import { castMembers, EMOTIONS, faceFor, findName, getGirl, GirlId, HONORIFICS, LineKey, lineFor, MOMENTS, pronoun, suggestNames } from '../data/girls';
import { useBob, usePop } from '../lib/motion';
import { useSettings } from '../lib/store';
import { consumeDaily, onDailyOpen } from '../lib/daily';
import { lineAvailable, playLine, setTone, shareLine, stopSpeaking } from '../lib/voice';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function CharactersScreen() {
  const { name, lang, honorific, reduceMotion, cast, update } = useSettings();
  const toast = useToast();
  const members = castMembers(cast);
  const [pickedId, setGirlId] = useState<GirlId>('hana');
  // Switching Girls/Boys falls back to the first character of that group.
  const girlId = members.some((m) => m.id === pickedId) ? pickedId : members[0].id;
  const [selectedKey, setLineKey] = useState<LineKey>('love');
  const [talking, setTalking] = useState(false);
  const [error, setError] = useState('');
  const girl = getGirl(girlId);
  // A moment may not have clips in the current language yet; fall back to Love if so.
  const lineKey: LineKey = lineAvailable(girl, selectedKey, lang) ? selectedKey : 'love';
  const pop = usePop(`${girlId}-${lineKey}`, reduceMotion);
  const bob = useBob(talking, reduceMotion);
  const line = lineFor(girlId, lineKey, lang, name, honorific);
  const known = findName(name, lang);
  const suggestions = suggestNames(name, lang);
  const hon = HONORIFICS.find((h) => h.key === honorific)!;
  const { subject, object } = pronoun(girl);

  useEffect(() => stopSpeaking, []);
  // A tapped daily-message notification: show that girl and play her line.
  useEffect(
    () =>
      onDailyOpen((p) => {
        consumeDaily();
        setGirlId(p.girl);
        update({ cast: getGirl(p.girl).cast });
        setLineKey(p.key);
        if (name.trim()) {
          setTalking(true);
          playLine(getGirl(p.girl), p.key, lang, name, honorific, () => setTalking(false));
        }
      }),
    [name, lang, honorific, update]
  );

  const play = (g: GirlId, e: LineKey) => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    setTalking(true);
    playLine(getGirl(g), e, lang, name, honorific, () => setTalking(false));
  };

  const onShare = async () => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    try {
      await shareLine(girl, lineKey, lang, name, honorific);
    } catch {
      toast("Couldn't share the clip. Try again.");
    }
  };

  const onSetRingtone = async () => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    try {
      const msg = await setTone(girl, lineKey, lang, name, honorific, 'ringtone', `${girl.name} - ${lineKey}`);
      if (msg) toast(msg);
    } catch {
      toast("Couldn't set the tone. Try again.");
    }
  };

  return (
    <Screen
      title="Senpai says"
      subtitle="Pick a character, then a feeling"
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
              ? `${subject} calls you ${known.kana}${hon.jp}`
              : `This name isn't in the voice list yet, so ${subject.toLowerCase()}'ll call you せんぱい (Senpai)`
            : known
              ? `${subject} calls you ${name.trim()}${hon.en}`
              : `This name isn't in the English voice list yet, so ${subject.toLowerCase()}'ll call you Senpai. Try the Japanese voice.`}
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
            <Face girl={girl} emotion={faceFor(girlId, lineKey)} size={150} />
          </View>
        </Animated.View>
        <Text style={[styles.who, { color: girl.fg }]}>
          {girl.name} · {girl.type}
        </Text>
        <Text style={styles.line}>{name.trim() ? `"${line.show}"` : `Type your name to hear ${object} say it`}</Text>
        {line.sub && name.trim() ? <Text style={styles.sub}>{line.sub}</Text> : null}
        {!lineAvailable(girl, 'love', lang) ? (
          <Text style={styles.sub}>
            {girl.name}&apos;s {lang === 'en' ? 'English' : 'Japanese'} voice is coming soon.
            {lineAvailable(girl, 'love', lang === 'en' ? 'jp' : 'en')
              ? ` Tap ${lang === 'en' ? 'EN' : 'JP'} at the top to hear ${object} in ${lang === 'en' ? 'Japanese' : 'English'}.`
              : ''}
          </Text>
        ) : null}
      </NeuCard>

      <View style={styles.grid}>
        {EMOTIONS.map((e) => (
          <NeuButton
            key={e.key}
            active={e.key === lineKey}
            onPress={() => {
              setLineKey(e.key);
              play(girlId, e.key);
            }}
            style={styles.emo}
            accessibilityLabel={e.label}
          >
            <Ionicons name={e.icon as IconName} size={22} color={e.key === lineKey ? C.accent : C.text} />
            <Text style={[styles.emoText, e.key === lineKey && { color: C.accent }]}>{e.label}</Text>
          </NeuButton>
        ))}
      </View>

      {MOMENTS.some((m) => lineAvailable(girl, m.key, lang)) && <Text style={styles.sectionTitle}>Special moments</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.momentsScroll} contentContainerStyle={styles.moments}>
        {MOMENTS.filter((m) => lineAvailable(girl, m.key, lang)).map((m) => (
          <NeuButton
            key={m.key}
            active={m.key === lineKey}
            onPress={() => {
              setLineKey(m.key);
              play(girlId, m.key);
            }}
            style={styles.moment}
            radius={14}
            depth={4}
            accessibilityLabel={m.label}
          >
            <Ionicons name={m.icon as IconName} size={18} color={m.key === lineKey ? C.accent : C.text} />
            <Text style={[styles.momentText, m.key === lineKey && { color: C.accent }]}>{m.label}</Text>
          </NeuButton>
        ))}
      </ScrollView>

      <CastSwitch />
      <View style={styles.girls}>
        {members.map((g) => (
          <NeuButton
            key={g.id}
            active={g.id === girlId}
            onPress={() => {
              setGirlId(g.id);
              play(g.id, lineKey);
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

      <View style={styles.ctaRowWrap}>
        <NeuButton onPress={onShare} containerStyle={{ flex: 1 }} style={styles.cta} radius={18} accessibilityLabel="Share this voice line">
          <View style={styles.ctaRow}>
            <Ionicons name="share-social-outline" size={18} color={C.accent} />
            <Text style={styles.ctaText}>Share</Text>
          </View>
        </NeuButton>
        <NeuButton onPress={onSetRingtone} containerStyle={{ flex: 1.6 }} style={styles.cta} radius={18} accessibilityLabel="Set this line as ringtone">
          <View style={styles.ctaRow}>
            <Ionicons name="notifications-outline" size={18} color={C.accent} />
            <Text style={styles.ctaText}>Set as ringtone</Text>
          </View>
        </NeuButton>
      </View>
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  // Negative margins let the neumorphic shadows show instead of being clipped by the scroll view.
  momentsScroll: { marginHorizontal: -20, marginBottom: 14 },
  moments: { paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  moment: { flexDirection: 'row', paddingHorizontal: 14, height: 42, gap: 6 },
  momentText: { fontSize: 13, fontWeight: '600', color: C.text },
  girls: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  girl: { width: 74, paddingVertical: 10, gap: 4 },
  girlName: { fontSize: 12, fontWeight: '600', color: C.text },
  ctaRowWrap: { flexDirection: 'row', gap: 14 },
  cta: { height: 54 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: C.accent, fontWeight: '700', fontSize: 15 },
});
