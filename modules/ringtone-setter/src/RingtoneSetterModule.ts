import { NativeModule, requireOptionalNativeModule } from 'expo';

import { ToneType } from './RingtoneSetter.types';

declare class RingtoneSetterModule extends NativeModule<Record<string, never>> {
  canWriteSettings(): boolean;
  openWriteSettings(): void;
  setToneFromFileAsync(path: string, title: string, type: ToneType): Promise<string>;
  setToneFromFilesAsync(paths: string[], title: string, type: ToneType): Promise<string>;
}

// Null in Expo Go and on iOS, where apps can't change system tones.
export default requireOptionalNativeModule<RingtoneSetterModule>('RingtoneSetter');
