---
title: Senpai Says name voices
emoji: 💌
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Senpai Says name voices

Makes the Senpai Says characters say a name the app doesn't have built in. The app sends the name's
reading in katakana and gets back a small zip: every character saying it in every mood
(sweet, happy, angry, sad), exactly like the app's built-in name clips.

- `POST /name` with `{"kana": "ザルヴィシュ"}` returns `application/zip` of `<character>/<mood>.mp3`
- `GET /` health check

Only katakana names up to 20 characters are accepted. Names are not stored or logged.

Voices: VOICEVOX:WhiteCUL, VOICEVOX:暁記ミタマ, VOICEVOX:四国めたん, VOICEVOX:猫使アル,
VOICEVOX:玄野武宏, VOICEVOX:青山龍星, VOICEVOX:離途, VOICEVOX:白上虎太郎.

Source: `server/` in the Senpai Says repository; deploy with `scripts/deploy_name_server.sh`.
