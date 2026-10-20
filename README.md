# Senpai Says

Original anime girls (Hana, Rei, Aiko, Yui) say your name with different emotions. Set their lines as your ringtone, message tone, or alarm (Android).

## Voices

Real voices in both languages ship inside the app as small MP3s in `assets/voices/jp` and `assets/voices/en`, so they work offline.

| Girl | Japanese ([VOICEVOX](https://voicevox.hiroshiba.jp/)) | English ([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)) |
| --- | --- | --- |
| Hana (shy) | 猫使ビィ | af_nicole |
| Rei (cool) | 冥鳴ひまり | af_kore |
| Aiko (tsundere) | 四国めたん | af_bella |
| Yui (genki) | 満別花丸 | af_heart |

The four VOICEVOX voices allow commercial use with credit. The app shows "VOICEVOX:<name>" credits in Settings, and you must keep them (also add them to the Play Store description). Each voice's full terms are in its VOICEVOX library page. Kokoro is Apache 2.0, so commercial use is allowed and no credit is required.

How names work: each girl says the name clip (for example バーキル, or "Baqar" in English), then the rest of the line with the chosen honorific (-kun, -chan, -san, -senpai, or none). Names that aren't in `src/data/names.json` get the "senpai" version.

### Add names or change lines

1. Edit `src/data/names.json` (katakana, then spellings) or `src/data/lines.json`.
2. Get VOICEVOX Core: install the wheel from the [voicevox_core releases](https://github.com/VOICEVOX/voicevox_core/releases) (`pip install voicevox_core-*.whl`), then run its `download` tool to fetch ONNX Runtime and the dictionary (it asks you to accept the terms). Download only the voice models you need from [voicevox_vvm releases](https://github.com/VOICEVOX/voicevox_vvm/releases) into `models/vvms/`: `0.vvm`, `1.vvm`, `5.vvm`, `13.vvm`, `14.vvm`, `21.vvm`.
3. Run `python scripts/generate_voices.py --vv <download dir>` (needs ffmpeg). Only changed clips are regenerated.
4. English: `pip install kokoro-onnx`, download `kokoro-v1.0.fp16.onnx` and `voices-v1.0.bin` from the [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases) (model-files-v1.1), then run `python scripts/generate_voices_en.py --model kokoro-v1.0.fp16.onnx --voices voices-v1.0.bin`. If it fails with an espeak `phontab` error, the espeak data path is too long: copy `espeakng_loader/espeak-ng-data` from your Python packages to a short folder and add `--espeak-data <that folder>`.
5. Commit `assets/voices/` and `src/data/voice-assets.ts`.

## Run locally (web preview)

Needs Node 22 (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
npx expo start --web
```

Setting ringtones only works in the Android app, not on web or in Expo Go.

## Build the Android app on GitHub (no EAS, no Expo build limits)

`.github/workflows/android.yml` runs `expo prebuild` and Gradle on GitHub's own runner on every push to `main` (or from **Actions → Android build → Run workflow**).

Download the result from the run page, under **Artifacts**:

- `senpai-says-apk`: install it on your phone to test
- `senpai-says-aab`: upload this to the Play Console

### Play Store signing (optional)

Without these secrets the build is signed with the debug key, which is fine for testing but not for the Play Store. Create an upload key once:

```bash
keytool -genkeypair -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Then add these repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | output of `base64 -i upload.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | key password |

Keep `upload.keystore` safe and never commit it. If you lose it, you can't update the app.

## Project layout

- `src/app/`: screens (Girls, Ringtones, Alarm, Settings)
- `src/data/girls.ts`: characters and voice lines (English and Japanese)
- `src/components/`: neumorphic UI, face art, toast
- `src/lib/motion.ts`: light native-driver animations (turned off by "Reduce animations")
- `modules/ringtone-setter/`: Android native module that joins the voice clips into one file and sets it as a ringtone, notification, or alarm
- `scripts/generate_voices.py` / `generate_voices_en.py`: make the Japanese (VOICEVOX) and English (Kokoro) clips; `voice_index.py` writes `src/data/voice-assets.ts`
- `plugins/withReleaseSigning.js`: config plugin that signs release builds in CI

## Next steps

- Replace the placeholder face art with real art (one image per girl per emotion)
- Optionally replace the main lines with a hired Japanese voice actor, and keep VOICEVOX for the name clips
