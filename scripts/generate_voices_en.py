#!/usr/bin/env python3
"""Generate the girls' English voice clips with Kokoro TTS (Apache 2.0).

Usage:
  python scripts/generate_voices_en.py --model kokoro-v1.0.fp16.onnx --voices voices-v1.0.bin

Model files: https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.1).
Needs `pip install kokoro-onnx` and ffmpeg on PATH.

Writes assets/voices/en/<girl>/{names,lines}/*.mp3 and refreshes src/data/voice-assets.ts.
Clips whose text and voice settings haven't changed are skipped.
"""

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from kokoro_onnx import EspeakConfig, Kokoro

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_index import LEADING_PUNCT, LINES, NAMES, VOICES, write_index  # noqa: E402

OUT = VOICES / "en"
MANIFEST = OUT / "manifest.json"
# Trim leading/trailing silence so the name clip and the line join naturally.
TRIM = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse")


def to_mp3(samples: np.ndarray, rate: int, dest: Path, tail: float):
    dest.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(pcm.tobytes())
        # Same CBR, header-free format as the Japanese clips so they can be byte-joined.
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-af", f"{TRIM},apad=pad_dur={tail}",
             "-ac", "1", "-ar", "24000", "-b:a", "48k", "-map_metadata", "-1", "-id3v2_version", "0",
             "-write_xing", "0", str(dest)],
            check=True,
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", type=Path, required=True)
    ap.add_argument("--voices", type=Path, required=True)
    # espeak-ng silently fails on data paths longer than ~160 characters (common in venvs);
    # copy espeakng_loader's espeak-ng-data somewhere short and pass it here if that happens.
    ap.add_argument("--espeak-data", type=Path, help="Short path to an espeak-ng-data folder")
    args = ap.parse_args()

    espeak = EspeakConfig(data_path=str(args.espeak_data)) if args.espeak_data else None
    kokoro = Kokoro(str(args.model), str(args.voices), espeak_config=espeak)
    available = set(kokoro.get_voices())
    for g in LINES["girls"].values():
        if g["en"]["voice"] not in available:
            sys.exit(f"Unknown Kokoro voice {g['en']['voice']}. Available: {sorted(available)}")

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    new_manifest = {}
    made = skipped = 0

    def clip(dest: Path, text: str, cfg: dict, tail: float):
        nonlocal made, skipped
        key = str(dest.relative_to(OUT))
        sig = hashlib.sha1(json.dumps([text, cfg["voice"], cfg["speed"], tail, TRIM]).encode()).hexdigest()
        new_manifest[key] = sig
        if manifest.get(key) == sig and dest.exists():
            skipped += 1
            return
        samples, rate = kokoro.create(text, voice=cfg["voice"], speed=cfg["speed"], lang="en-us")
        to_mp3(samples, rate, dest, tail)
        made += 1
        if made % 50 == 0:
            print(f"  {made} clips made...", flush=True)

    for gid, girl in LINES["girls"].items():
        cfg = girl["en"]
        print(f"{gid}: {cfg['voice']}", flush=True)
        for lkey, line in LINES["lines"][gid].items():
            assert line["en"].startswith("{n}"), f"{gid}.{lkey} en must start with {{n}}"
            rest = line["en"][len("{n}"):]
            for hon in LINES["honorifics"]:
                text = f"{hon['enSpeak']}{rest}".lstrip(LEADING_PUNCT)
                # Capitalize when the line itself starts the sentence (no honorific).
                text = text[:1].upper() + text[1:]
                clip(OUT / gid / "lines" / f"{lkey}_{hon['key']}.mp3", text, cfg, 0.15)
        for entry in NAMES:
            spelling = entry[1]
            clip(OUT / gid / "names" / f"{spelling}.mp3", spelling.capitalize(), cfg, 0.04)

    for key in set(manifest) - set(new_manifest):
        (OUT / key).unlink(missing_ok=True)
    MANIFEST.write_text(json.dumps(new_manifest, indent=0, sort_keys=True) + "\n")
    write_index()
    print(f"Done: {made} made, {skipped} unchanged.")


if __name__ == "__main__":
    main()
