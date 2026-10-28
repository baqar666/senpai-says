import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Switch, Text, View } from 'react-native';

import RingtoneSetter from '../../modules/ringtone-setter';
import { effectiveGuard, GUARD_APPS, GUARD_LIMITS, guardPermissions, guardSupported } from '../lib/guard';
import { FREE_GUARD_LIMIT, usePass } from '../lib/pass';
import { useSettings } from '../lib/store';
import { C, NeuButton, NeuCard } from './Neu';

// "Stop me scrolling": the screen-time guard's settings, with the permission steps it needs.
export function GuardSettings() {
  const { guardOn, guardLimit, guardApps, update } = useSettings();
  const { pro, gate, openPaywall } = usePass();
  // What the watcher actually uses: free users get one app at the 1-hour limit.
  const { apps: activeApps, limit: activeLimit } = effectiveGuard(guardApps, guardLimit, pro);
  const [perms, setPerms] = useState(guardPermissions);
  const [used, setUsed] = useState<number | null>(null);

  // Permissions are granted in system screens, so re-check whenever the user comes back.
  useEffect(() => {
    const refresh = () => {
      setPerms(guardPermissions());
      setUsed(guardSupported ? RingtoneSetter!.guardStatus().usedMinutes : null);
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);

  const ready = perms.usage && perms.overlay;
  // Free: tapping an app switches to it. Pass: apps toggle on and off.
  const toggleApp = (id: (typeof GUARD_APPS)[number]['id']) => {
    if (!pro) return update({ guardApps: [id] });
    update({ guardApps: guardApps.includes(id) ? guardApps.filter((a) => a !== id) : [...guardApps, id] });
  };
  const pickLimit = (m: number) =>
    pro || m === FREE_GUARD_LIMIT
      ? update({ guardLimit: m })
      : gate({ title: 'Choose any daily limit', allowAd: false, action: () => update({ guardLimit: m }) });

  return (
    <>
      <NeuCard radius={18} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Stop me scrolling</Text>
          <Text style={styles.rowSub}>
            {guardSupported ? 'A girl stops you when you scroll too long' : 'Available in the Android app'}
          </Text>
        </View>
        <Switch
          value={guardOn}
          disabled={!guardSupported}
          onValueChange={(v) => update({ guardOn: v })}
          trackColor={{ false: C.dark, true: '#ED93B1' }}
          thumbColor={guardOn ? C.accent : '#fff'}
        />
      </NeuCard>

      {guardOn && (
        <View style={styles.panel}>
          <Text style={styles.explain}>
            Senpai Says checks how long you use the apps below today. When you pass your limit, a girl appears over the app
            and tells you to take a break. This needs two permissions. Your usage never leaves your phone.
          </Text>

          <Step
            done={perms.usage}
            title="1. Usage access"
            sub="To count your time in the picked apps"
            onAllow={() => RingtoneSetter?.openUsageAccessSettings()}
          />
          {!perms.usage && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                Android says &quot;App was denied access&quot; or &quot;Restricted setting&quot;? That happens when the app is installed
                from an APK file. Open App info, tap ⋮ at the top right, choose &quot;Allow restricted settings&quot;, then tap Allow again.
              </Text>
              <NeuButton onPress={() => RingtoneSetter?.openAppInfo()} style={styles.allow} radius={12} depth={3} accessibilityLabel="Open app info">
                <Text style={styles.allowText}>Open app info</Text>
              </NeuButton>
            </View>
          )}
          <Step
            done={perms.overlay}
            title="2. Display over other apps"
            sub="So she can appear on top of Instagram & co"
            onAllow={() => RingtoneSetter?.openOverlaySettings()}
          />

          <Step
            done={perms.battery}
            title="3. Keep it running (recommended)"
            sub="Set battery to Unrestricted. On Xiaomi, Oppo and Vivo also turn on Autostart in App info"
            onAllow={() => RingtoneSetter?.openBatterySettings()}
          />

          <Text style={styles.label}>Daily limit</Text>
          <View style={styles.chips}>
            {GUARD_LIMITS.map((m) => (
              <NeuButton key={m} active={activeLimit === m} onPress={() => pickLimit(m)} style={styles.chip} radius={12} depth={3} accessibilityLabel={`${m} minute limit`}>
                <Text style={[styles.chipText, activeLimit === m && { color: C.accent }]}>
                  {!pro && m !== FREE_GUARD_LIMIT ? '🔒 ' : ''}
                  {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}`}
                </Text>
              </NeuButton>
            ))}
          </View>

          <Text style={styles.label}>Watch these apps</Text>
          <View style={styles.chips}>
            {GUARD_APPS.map((a) => {
              const on = activeApps.includes(a.id);
              return (
                <NeuButton key={a.id} active={on} onPress={() => toggleApp(a.id)} style={styles.chip} radius={12} depth={3} accessibilityLabel={`${on ? 'Stop watching' : 'Watch'} ${a.label}`}>
                  <Text style={[styles.chipText, on && { color: C.accent }]}>{a.label}</Text>
                </NeuButton>
              );
            })}
          </View>

          {!pro && (
            <Text style={styles.freeNote} onPress={() => openPaywall('Watch every app with any limit')}>
              Free: one app at a 1-hour limit. <Text style={styles.freeLink}>Get Senpai Pass</Text> for every app and any limit.
            </Text>
          )}
          <Text style={styles.status}>
            {!ready
              ? 'Allow both permissions to start.'
              : !activeApps.length
                ? 'Pick at least one app.'
                : `On 👀  ${used ?? 0} of ${activeLimit} min used today`}
          </Text>
        </View>
      )}
    </>
  );
}

function Step({ done, title, sub, onAllow }: { done: boolean; title: string; sub: string; onAllow: () => void }) {
  return (
    <NeuCard radius={16} style={styles.step}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {done ? (
        <Ionicons name="checkmark-circle" size={26} color="#1D9E75" accessibilityLabel="Allowed" />
      ) : (
        <NeuButton onPress={onAllow} style={styles.allow} radius={12} depth={3} accessibilityLabel={`Allow ${title}`}>
          <Text style={styles.allowText}>Allow</Text>
        </NeuButton>
      )}
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 24 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  panel: { marginTop: -8, marginBottom: 24 },
  explain: { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 14 },
  step: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 14 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  allow: { height: 36, paddingHorizontal: 14 },
  allowText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -4, marginBottom: 14, paddingHorizontal: 4 },
  hintText: { flex: 1, fontSize: 11, color: C.muted, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 10, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  chip: { paddingHorizontal: 12, height: 38 },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  freeNote: { fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  freeLink: { color: C.accent, fontWeight: '700' },
  status: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
});
