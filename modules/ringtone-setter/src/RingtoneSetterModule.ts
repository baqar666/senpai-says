import { NativeModule, requireOptionalNativeModule } from 'expo';

import { GuardStatus, GuardTrigger, ToneType } from './RingtoneSetter.types';

declare class RingtoneSetterModule extends NativeModule<{ onGuard: (e: GuardTrigger) => void }> {
  canWriteSettings(): boolean;
  openWriteSettings(): void;
  setToneFromFileAsync(path: string, title: string, type: ToneType): Promise<string>;
  setToneFromFilesAsync(paths: string[], title: string, type: ToneType): Promise<string>;

  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  openAppInfo(): void;
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  startGuard(packages: string[], limitMinutes: number): void;
  stopGuard(): void;
  guardStatus(): GuardStatus;
  takePendingGuard(): GuardTrigger | null;
  snoozeGuard(minutes: number): void;
  goHome(): void;
}

// Null in Expo Go and on iOS, where apps can't change system tones.
export default requireOptionalNativeModule<RingtoneSetterModule>('RingtoneSetter');
