#!/usr/bin/env python3
"""Generate the girls' Japanese voice clips with VOICEVOX Core.

Usage:
  python scripts/generate_voices.py --vv <voicevox_core download dir>

The download dir is what VOICEVOX's `download` tool creates (onnxruntime/, dict/, models/vvms/).
Needs `pip install voicevox_core` (0.17+) and ffmpeg on PATH.

Writes:
  assets/voices/jp/<girl>/names/<name>.mp3      the girl saying each name
  assets/voices/jp/<girl>/lines/<line>_<hon>.mp3  the rest of each line, per honorific
  src/data/voice-assets.ts                      require() index for the app (via voice_index.py)

Clips whose text and voice settings haven't changed are skipped, so re-runs are fast.
"""

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

from voice_index import LEADING_PUNCT, LINES, NAMES_JP as NAMES, ROOT, VOICES, write_index

OUT = VOICES / "jp"
MANIFEST = OUT / "manifest.json"
SAMPLES = ROOT / ".voicegen/samples/jp"


def load_synth(vv: Path):
    lib = next((vv / "onnxruntime/lib").glob("libvoicevox_onnxruntime.*.*"))
    ort = Onnxruntime.load_once(filename=str(lib))
    dict_dir = next((vv / "dict").glob("open_jtalk_dic_utf_8-*"))
    synth = Synthesizer(ort, OpenJtalk(str(dict_dir)))
    wanted = {g["speaker"] for g in LINES["girls"].values()}
    styles: dict[tuple[str, str], int] = {}
    for vvm in sorted((vv / "models/vvms").glob("*.vvm")):
        with VoiceModelFile.open(str(vvm)) as model:
            metas = model.metas
            if not any(m.name in wanted and any(s.type == "talk" for s in m.styles) for m in metas):
                continue
            synth.load_voice_model(model)
            for m in metas:
                for s in m.styles:
                    if s.type == "talk":  # skip singing styles in s*.vvm
                        styles[(m.name, s.name)] = s.id
    missing = [(s, st) for g in LINES["girls"].values() for s, st in
               [(g["speaker"], g["nameStyle"]), *((g["speaker"], x) for x in g["styles"].values())]
               if (s, st) not in styles]
    if missing:
        have = sorted({k for k in styles})
        sys.exit(f"Missing VOICEVOX styles: {sorted(set(missing))}\nAvailable: {have}")
    return synth, styles


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vv", type=Path, required=True, help="VOICEVOX Core download directory")
    ap.add_argument("--sample", action="store_true", help="Only make a few clips into .voicegen/samples/jp")
    args = ap.parse_args()

    synth, styles = load_synth(args.vv)
    base = SAMPLES if args.sample else OUT
    manifest = {} if args.sample or not MANIFEST.exists() else json.loads(MANIFEST.read_text())
    new_manifest = {}
    made = skipped = 0

    def clip(dest: Path, text: str, style: str, girl: dict, tune: dict, pre: float, post: float):
        nonlocal made, skipped
        sid = styles[(girl["speaker"], style)]
        key = str(dest.relative_to(base))
        speed = girl["speed"] * tune.get("speed", 1.0)
        pitch = girl["pitch"] + tune.get("pitch", 0.0)
        inton = tune.get("intonation", 1.0)
        volume = tune.get("volume", 1.0)
        sig = hashlib.sha1(json.dumps([text, sid, girl["speed"], girl["pitch"], tune, pre, post]).encode()).hexdigest()
        new_manifest[key] = sig
        if manifest.get(key) == sig and dest.exists():
            skipped += 1
            return
        q = synth.create_audio_query(text, sid)
        q.speed_scale = speed
        q.pitch_scale = pitch
        q.intonation_scale = inton
        q.volume_scale = volume
        q.pre_phoneme_length = pre
        q.post_phoneme_length = post
        shape(q, tune)
        to_mp3(synth.synthesis(q, sid), dest)
        made += 1
        if made % 50 == 0:
            print(f"  {made} clips made...", flush=True)

    hons = [h for h in LINES["honorifics"] if not args.sample or h["key"] == "kun"]
    names = [e for e in NAMES if not args.sample or e[1] == "baqar"]
    for gid, girl in LINES["girls"].items():
        print(f"{gid}: {girl['speaker']}", flush=True)
        for lkey, line in LINES["lines"][gid].items():
            if args.sample and lkey not in ("love", "angry", "miss", "shy"):
                continue
            assert line["jp"].startswith("{n}"), f"{gid}.{lkey} must start with {{n}}"
            rest = line["jp"][len("{n}"):]
            for hon in hons:
                text = (hon["jp"] + rest).lstrip(LEADING_PUNCT)
                clip(base / gid / "lines" / f"{lkey}_{hon['key']}.mp3", text, girl["styles"][lkey], girl,
                     LINES["jpContours"][line["jpContour"]], 0.02, 0.15)
        for entry in names:
            kana, ident = entry[0], entry[1]
            # Soft or loud name, matching the line it leads into.
            for tone, punct in (("soft", "…"), ("loud", "！")):
                clip(base / gid / "names" / f"{ident}_{tone}.mp3", kana + punct, girl["nameStyle"], girl,
                     LINES["jpNameTune"][tone], 0.05, 0.02)

    if args.sample:
        print(f"Samples in {base}")
        return
    # Drop clips that are no longer referenced (including the old single-tone name clips).
    for key in set(manifest) - set(new_manifest):
        (OUT / key).unlink(missing_ok=True)
    for stale in OUT.rglob("*.mp3"):
        if str(stale.relative_to(OUT)) not in new_manifest:
            stale.unlink()
    MANIFEST.write_text(json.dumps(new_manifest, indent=0, sort_keys=True) + "\n")

    print(f"Done: {made} made, {skipped} unchanged.")
    try:
        write_index()
    except SystemExit as e:  # English clips not generated yet
        print(f"Index not updated: {e}")


if __name__ == "__main__":
    main()
