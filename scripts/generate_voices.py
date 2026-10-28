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
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from voice_index import LEADING_PUNCT, LINES, NAMES_JP as NAMES, ROOT, VOICES, write_index
from voicegen import NAME_POST, NAME_PRE, load_synth, name_variants, render, shape, to_mp3  # noqa: F401  (shape: used by sample scripts)

OUT = VOICES / "jp"
MANIFEST = OUT / "manifest.json"
SAMPLES = ROOT / ".voicegen/samples/jp"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vv", type=Path, required=True, help="VOICEVOX Core download directory")
    ap.add_argument("--sample", action="store_true", help="Only make a few clips into .voicegen/samples/jp")
    args = ap.parse_args()

    synths, styles = load_synth(args.vv, LINES["girls"])
    base = SAMPLES if args.sample else OUT
    manifest = {} if args.sample or not MANIFEST.exists() else json.loads(MANIFEST.read_text())
    new_manifest = {}
    made = skipped = 0

    def clip(dest: Path, text: str, style: str, girl: dict, tune: dict, pre: float, post: float):
        nonlocal made, skipped
        sid = styles[(girl["speaker"], style)]
        key = str(dest.relative_to(base))
        sig = hashlib.sha1(json.dumps([text, sid, girl["speed"], girl["pitch"], tune, pre, post]).encode()).hexdigest()
        new_manifest[key] = sig
        if manifest.get(key) == sig and dest.exists():
            skipped += 1
            return
        to_mp3(render(synths[girl["speaker"]], sid, girl, text, tune, pre, post), dest)
        made += 1
        if made % 50 == 0:
            print(f"  {made} clips made...", flush=True)
        # Save progress now and then, so a stopped run picks up where it left off.
        if made % 200 == 0 and not args.sample:
            MANIFEST.write_text(json.dumps({**manifest, **new_manifest}, indent=0, sort_keys=True) + "\n")

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
                # Special moments reuse the voice style of the face they show (lines.json "face").
                style = girl["styles"].get(lkey) or girl["styles"][line.get("face", "love")]
                clip(base / gid / "lines" / f"{lkey}_{hon['key']}.mp3", text, style, girl,
                     LINES["jpContours"][line["jpContour"]], 0.02, 0.15)
        for entry in names:
            kana, ident = entry[0], entry[1]
            # The name in each mood (sweet/happy/angry/sad), in the voice style of the matching emotion,
            # so an angry line starts with an angry name (lines.json nameMoods, line nameMood).
            for mood, text, style, tune in name_variants(LINES, girl, kana):
                clip(base / gid / "names" / f"{ident}_{mood}.mp3", text, style, girl, tune, NAME_PRE, NAME_POST)

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
