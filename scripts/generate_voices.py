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

from voice_index import LEADING_PUNCT, LINES, NAMES, VOICES, write_index

OUT = VOICES / "jp"
MANIFEST = OUT / "manifest.json"


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
    args = ap.parse_args()

    synth, styles = load_synth(args.vv)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    new_manifest = {}
    made = skipped = 0

    def clip(dest: Path, text: str, style: str, girl: dict, pre: float, post: float):
        nonlocal made, skipped
        sid = styles[(girl["speaker"], style)]
        key = str(dest.relative_to(OUT))
        sig = hashlib.sha1(json.dumps([text, sid, girl["speed"], girl["pitch"], pre, post]).encode()).hexdigest()
        new_manifest[key] = sig
        if manifest.get(key) == sig and dest.exists():
            skipped += 1
            return
        q = synth.create_audio_query(text, sid)
        q.speed_scale = girl["speed"]
        q.pitch_scale = girl["pitch"]
        q.pre_phoneme_length = pre
        q.post_phoneme_length = post
        to_mp3(synth.synthesis(q, sid), dest)
        made += 1
        if made % 50 == 0:
            print(f"  {made} clips made...", flush=True)

    for gid, girl in LINES["girls"].items():
        print(f"{gid}: {girl['speaker']}", flush=True)
        for lkey, line in LINES["lines"][gid].items():
            assert line["jp"].startswith("{n}"), f"{gid}.{lkey} must start with {{n}}"
            rest = line["jp"][len("{n}"):]
            for hon in LINES["honorifics"]:
                text = (hon["jp"] + rest).lstrip(LEADING_PUNCT)
                clip(OUT / gid / "lines" / f"{lkey}_{hon['key']}.mp3", text, girl["styles"][lkey], girl, 0.02, 0.15)
        for entry in NAMES:
            kana, ident = entry[0], entry[1]
            clip(OUT / gid / "names" / f"{ident}.mp3", kana, girl["nameStyle"], girl, 0.05, 0.02)

    # Drop clips that are no longer referenced.
    for key in set(manifest) - set(new_manifest):
        (OUT / key).unlink(missing_ok=True)
    MANIFEST.write_text(json.dumps(new_manifest, indent=0, sort_keys=True) + "\n")

    write_index()
    print(f"Done: {made} made, {skipped} unchanged.")


if __name__ == "__main__":
    main()
