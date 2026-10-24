# Senpai Says

Original anime girls (Hana, Rei, Aiko, Yui) say your name with different emotions. Set their lines as your ringtone, message tone, or alarm (Android).

## Voices

Real voices in both languages ship inside the app as small MP3s in `assets/voices/jp` and `assets/voices/en`, so they work offline.

| Girl | Japanese ([VOICEVOX](https://voicevox.hiroshiba.jp/)) | English ([Orpheus](https://github.com/canopyai/Orpheus-TTS)) |
| --- | --- | --- |
| Hana (shy) | WhiteCUL | leah |
| Rei (cool) | 冥鳴ひまり | mia |
| Aiko (tsundere) | 四国めたん | jess |
| Yui (genki) | 春日部つむぎ | tara |

The four VOICEVOX voices allow commercial use with credit. The app shows "VOICEVOX:<name>" credits in Settings, and you must keep them (also add them to the Play Store description). Each voice's full terms are in its VOICEVOX library page. Orpheus is Apache 2.0 and built on Llama 3.2, whose community license allows commercial use with a "Built with Llama" credit (shown in Settings).

How names work: each girl says the name clip (for example バーキル, or "Baqar" in English), then the rest of the line with the chosen honorific (-kun, -chan, -san, -senpai, or none). Japanese knows about 815 names (`src/data/names.json` plus `src/data/names_jp_extra.json`, including Japanese and anime names, and names typed in katakana or hiragana); English knows the 230 in `names.json`. Any other name gets the "senpai" version. To give English the extra names too, move entries from `names_jp_extra.json` into `names.json` and run the English workflow.

### Add names or change lines

1. Edit `src/data/names.json` / `names_jp_extra.json` (katakana, then spellings) or `src/data/lines.json`.
2. Japanese: get VOICEVOX Core. Install the wheel from the [voicevox_core releases](https://github.com/VOICEVOX/voicevox_core/releases) (`pip install voicevox_core-*.whl`), then run its `download` tool to fetch ONNX Runtime and the dictionary (it asks you to accept the terms). Download only the voice models you need from [voicevox_vvm releases](https://github.com/VOICEVOX/voicevox_vvm/releases) into `models/vvms/`: `0.vvm`, `1.vvm`, `5.vvm`, `8.vvm`, `13.vvm`, `14.vvm`, `21.vvm`.
3. Run `python scripts/generate_voices.py --vv <download dir>` (needs ffmpeg). Only changed clips are regenerated.
4. English: run the **Generate English voices** workflow in the GitHub Actions tab. Pick `sample` to download a few previews first, then `full` to generate every clip; it commits them and starts the Android build. (Locally: `pip install orpheus-cpp scipy` plus `llama-cpp-python==0.3.19` from the Metal wheel index, then `python scripts/generate_voices_en.py`. It needs about 3 GB of free RAM and disk.)
5. Commit `assets/voices/jp` and `src/data/voice-assets.ts` (the English workflow commits its own clips).

## Character art

Follow `art/GROK_PROMPTS.md` to make the 24 portraits (4 girls × 6 expressions) and the icon in Grok, save them in `art/raw/`, then run `python3 scripts/process_art.py`. The app shows real art wherever a portrait exists and the drawn faces everywhere else.

## Features

- Emotions (love, angry, miss, shy, good night, calling) and special moments (birthday, Eid, exam luck, eat, gym, take care, proud, thanks)
- Share a voice line as an MP3 (WhatsApp, TikTok, Instagram)
- Set lines as ringtone, message tone, or alarm (Android)
- Daily message notification (Settings, off by default)
- Store text and privacy policy: `store/STORE_LISTING.md`, https://baqar666.github.io/privacy-policies/senpai-says/

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
- `scripts/generate_voices.py` / `generate_voices_en.py`: make the Japanese (VOICEVOX, with per-emotion pitch shaping) and English (Orpheus) clips; `voice_index.py` writes `src/data/voice-assets.ts`
- `plugins/withReleaseSigning.js`: config plugin that signs release builds in CI

## Next steps

- Add the Grok character art (see Character art above)
- Rewarded ads (AdMob) to unlock extra lines
- Optionally replace the main lines with a hired Japanese voice actor, and keep VOICEVOX for the name clips
