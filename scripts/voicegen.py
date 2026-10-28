"""VOICEVOX helpers shared by generate_voices.py (built-in clips) and server/ (custom names).

Both must say a name the same way, so the voice styles, mood tuning and MP3 format all live here.
Settings come from src/data/lines.json (girls, nameMoods, jpNameTune, jpContours).
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

TALK = ("talk", "streaming_talk")  # newer models label their speaking styles "streaming_talk"; s*.vvm also has singing


def load_synth(vv: Path, girls: dict):
    """One synthesizer per character's voice, loading only the model files that contain it.

    Models from different VOICEVOX releases can share a character (e.g. ずんだもん in 0.vvm and 15.vvm)
    and refuse to load into the same synthesizer, so voices are kept apart.
    """
    lib = next((vv / "onnxruntime/lib").glob("libvoicevox_onnxruntime.*"))
    ort = Onnxruntime.load_once(filename=str(lib))
    dict_dir = next((vv / "dict").glob("open_jtalk_dic_utf_8-*"))
    jtalk = OpenJtalk(str(dict_dir))
    synths: dict[str, Synthesizer] = {}
    styles: dict[tuple[str, str], int] = {}
    for speaker in sorted({g["speaker"] for g in girls.values()}):
        synth = Synthesizer(ort, jtalk)
        for vvm in sorted((vv / "models/vvms").glob("*.vvm")):
            with VoiceModelFile.open(str(vvm)) as model:
                mine = [m for m in model.metas if m.name == speaker]
                if not any(s.type in TALK for m in mine for s in m.styles):
                    continue
                synth.load_voice_model(model)
                for m in mine:
                    for s in m.styles:
                        if s.type in TALK:
                            styles.setdefault((m.name, s.name), s.id)
        synths[speaker] = synth
    missing = [(s, st) for g in girls.values() for s, st in
               [(g["speaker"], g["nameStyle"]), *((g["speaker"], x) for x in g["styles"].values())]
               if (s, st) not in styles]
    if missing:
        have = sorted({k for k in styles})
        sys.exit(f"Missing VOICEVOX styles: {sorted(set(missing))}\nAvailable: {have}")
    return synths, styles


def _get(m, k):
    return m[k] if isinstance(m, dict) else getattr(m, k)


def _set(m, k, v):
    if isinstance(m, dict):
        m[k] = v
    else:
        setattr(m, k, v)


def shape(q, tune: dict):
    """Bends VOICEVOX's per-syllable pitch and timing into an emotion contour."""
    phrases = q.accent_phrases
    moras = [m for ap in phrases for m in _get(ap, "moras")]
    voiced = [m for m in moras if _get(m, "pitch") > 0]
    for m in moras:
        _set(m, "vowel_length", _get(m, "vowel_length") * tune.get("vowelScale", 1.0))
    for ap in phrases:
        pause = _get(ap, "pause_mora")
        if pause:
            # Some styles insert ~1s pauses at every comma; cap them so lines don't drag.
            length = _get(pause, "vowel_length") * tune.get("pauseScale", 1.0)
            _set(pause, "vowel_length", min(length, tune.get("pauseMax", 0.4)))
        boost = tune.get("accentBoost", 0.0)
        ap_moras, accent = _get(ap, "moras"), _get(ap, "accent")
        if boost and 0 < accent <= len(ap_moras) and _get(ap_moras[accent - 1], "pitch") > 0:
            _set(ap_moras[accent - 1], "pitch", _get(ap_moras[accent - 1], "pitch") + boost)
    for m in voiced[:2]:
        _set(m, "pitch", _get(m, "pitch") + tune.get("startPitch", 0.0))
    end = tune.get("endPitch", [])
    for m, delta in zip(voiced[-len(end):] if end else [], end):
        _set(m, "pitch", _get(m, "pitch") + delta)
    if moras:
        _set(moras[-1], "vowel_length", _get(moras[-1], "vowel_length") * tune.get("endLength", 1.0))


def render(synth: Synthesizer, sid: int, girl: dict, text: str, tune: dict, pre: float, post: float) -> bytes:
    """Speaks `text` in one style with the character's speed/pitch and an emotion tune. Returns WAV bytes."""
    q = synth.create_audio_query(text, sid)
    q.speed_scale = girl["speed"] * tune.get("speed", 1.0)
    q.pitch_scale = girl["pitch"] + tune.get("pitch", 0.0)
    q.intonation_scale = tune.get("intonation", 1.0)
    q.volume_scale = tune.get("volume", 1.0)
    q.pre_phoneme_length = pre
    q.post_phoneme_length = post
    shape(q, tune)
    return synth.synthesis(q, sid)


def to_mp3(wav: bytes, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        tmp.write(wav)
        tmp.flush()
        # CBR, no ID3/Xing headers: clips can be byte-joined into one ringtone file.
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-ac", "1", "-ar", "24000", "-b:a", "48k",
             "-map_metadata", "-1", "-id3v2_version", "0", "-write_xing", "0", str(dest)],
            check=True,
        )


NAME_PRE, NAME_POST = 0.05, 0.02


def name_variants(lines: dict, girl: dict, kana: str):
    """How a character says a name in each mood: (mood, text, style, tune).

    Each mood uses the style of a matching emotion (lines.json nameMoods), so an angry line starts
    with an angry name.
    """
    for mood, m in lines["nameMoods"].items():
        if mood.startswith("_"):
            continue
        style = girl["styles"].get(m["styleFrom"]) or girl["nameStyle"]
        punct = "…" if m["tone"] == "soft" else "！"
        yield mood, kana + punct, style, lines["jpNameTune"][m["tone"]]
