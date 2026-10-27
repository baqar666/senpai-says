# Senpai Says

Original anime girls (Hana, Rei, Aiko, Yui) and boys (Kaito, Ryuga, Jin, Haru) say your name with different emotions. Set their lines as your ringtone, message tone, or alarm (Android).

## Voices

Real voices in both languages ship inside the app as small MP3s in `assets/voices/jp` and `assets/voices/en`, so they work offline.

| Character | Japanese ([VOICEVOX](https://voicevox.hiroshiba.jp/)) | English ([Orpheus](https://github.com/canopyai/Orpheus-TTS)) |
| --- | --- | --- |
| Hana (shy) | WhiteCUL | leah |
| Rei (cool) | 暁記ミタマ | mia |
| Aiko (tsundere) | 四国めたん | jess |
| Yui (genki) | もち子さん | tara |
| Kaito (the strongest) | 玄野武宏 | zac |
| Ryuga (dark overlord) | 青山龍星 | dan |
| Jin (silent one) | 離途 | leo |
| Haru (gentle senpai) | 白上虎太郎 | leo |

These VOICEVOX voices allow commercial use with credit. The app shows "VOICEVOX:<name>" credits in Settings, and you must keep them (also add them to the Play Store description). Each voice's full terms are in its VOICEVOX library page. Orpheus is Apache 2.0 and built on Llama 3.2, whose community license allows commercial use with a "Built with Llama" credit (shown in Settings).

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

## Purchases and ads

**Free:** all characters and emotions, sharing, daily message, tone previews, setting Hana's or Kaito's tones, and "Stop me scrolling" for one app at a 1-hour limit. Other tones and special moments can be unlocked once by watching a rewarded ad.
**Senpai Pass** (one-time purchase): every tone, every moment, the full screen-time guard, future characters, and no ads.

Code: `src/lib/pass.tsx` (RevenueCat, cached for offline, restore, pending payments, refunds), `src/lib/ads.ts` (AdMob rewarded ads after Google's consent form), `src/components/Paywall.tsx`, `UnlockSheet.tsx`, `PassCard.tsx`. Free limits live in `FREE_TONE_CHARACTERS` and `FREE_GUARD_LIMIT`.

Until the IDs below are added, builds use Google's test AdMob IDs (debug builds show test ads, release builds show no ads) and purchases are switched off. The web preview fakes both in development so the screens can be tested.

### Set up (once)

1. **Google Play Console** (one-time $25): create the app `com.baqar.senpaisays`, upload an AAB to **Internal testing** (purchases only work in builds installed from Play), and add your Gmail as a license tester (**Settings → License testing**) so test purchases are free.
2. **In-app product**: Monetize → Products → In-app products → create `senpai_pass` (details in `store/STORE_LISTING.md`) and activate it.
3. **RevenueCat** (free up to $2.5k/month): create a project and a Play Store app, connect it with a Google service account (RevenueCat's guide walks through it), then:
   - Products: import `senpai_pass`
   - Entitlements: create `pass` and attach `senpai_pass`
   - Offerings: make the default offering with a **Lifetime** package containing `senpai_pass`
   - Copy the **public Android API key** (starts with `goog_`)
4. **AdMob**: add the app (Android), copy the **App ID** (`ca-app-pub-…~…`), create a **Rewarded** ad unit and copy its ID (`ca-app-pub-…/…`). Under **Privacy & messaging**, publish a GDPR message so the consent form appears in Europe.
5. Add the GitHub repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `REVENUECAT_ANDROID_KEY` | RevenueCat public Android key (`goog_…`) |
| `ADMOB_ANDROID_APP_ID` | AdMob App ID (`ca-app-pub-…~…`) |
| `ADMOB_REWARDED_ID` | AdMob rewarded ad unit ID (`ca-app-pub-…/…`) |

6. Also add the Play signing secrets below, then run the Android build. Never click your own real ads; use test ads or a registered test device.

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

- `src/app/`: screens (Home, Ringtones, Alarm, Settings)
- `src/data/girls.ts`: characters and voice lines (English and Japanese)
- `src/components/`: neumorphic UI, face art, toast
- `src/lib/motion.ts`: light native-driver animations (turned off by "Reduce animations")
- `modules/ringtone-setter/`: Android native module that joins the voice clips into one file and sets it as a ringtone, notification, or alarm
- `scripts/generate_voices.py` / `generate_voices_en.py`: make the Japanese (VOICEVOX, with per-emotion pitch shaping) and English (Orpheus) clips; `voice_index.py` writes `src/data/voice-assets.ts`
- `plugins/withReleaseSigning.js`: config plugin that signs release builds in CI

## Next steps

- Create the Play Console, RevenueCat and AdMob accounts (see Purchases and ads)
- Optionally replace the main lines with a hired Japanese voice actor, and keep VOICEVOX for the name clips
