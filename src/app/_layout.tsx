import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { StatusBar } from 'expo-status-bar';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, NeuCard } from '../components/Neu';
import { ToastProvider } from '../components/Toast';
import { SettingsProvider, useSettings } from '../lib/store';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabButton({ icon, label, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  return (
    <Pressable {...props} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: isFocused }}>
      <NeuCard pressed={isFocused} depth={isFocused ? 6 : 0} radius={14} style={styles.tabIcon}>
        <Ionicons name={isFocused ? (icon.replace('-outline', '') as IconName) : icon} size={20} color={isFocused ? C.accent : C.muted} />
      </NeuCard>
      <Text style={[styles.tabLabel, isFocused && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();
  const { ready } = useSettings();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.base }} />;
  return (
    <Tabs style={{ flex: 1, backgroundColor: C.base }}>
      <TabSlot />
      <TabList asChild>
        <NeuCard depth={8} radius={26} style={StyleSheet.flatten([styles.bar, { bottom: insets.bottom + 12 }])}>
          <TabTrigger name="girls" href="/" asChild>
            <TabButton icon="heart-outline" label="Girls" />
          </TabTrigger>
          <TabTrigger name="ringtones" href="/ringtones" asChild>
            <TabButton icon="notifications-outline" label="Ringtones" />
          </TabTrigger>
          <TabTrigger name="alarm" href="/alarm" asChild>
            <TabButton icon="alarm-outline" label="Alarm" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="settings-outline" label="Settings" />
          </TabTrigger>
        </NeuCard>
      </TabList>
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <AppTabs />
        </ToastProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabIcon: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11, color: C.muted, fontWeight: '500' },
});
