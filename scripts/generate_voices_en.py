#!/usr/bin/env python3
"""Generate the girls' expressive English voice clips with Orpheus TTS (free, runs locally).

Usage:
  python scripts/generate_voices_en.py --sample   # a few clips per girl into .voicegen/samples to listen first
  python scripts/generate_voices_en.py            # everything, into assets/voices/en

Needs `pip install orpheus-cpp scipy` plus llama-cpp-python (Metal build on Apple Silicon:
`pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/metal`),
and ffmpeg on PATH. The ~2 GB model downloads from Hugging Face on first run.

Orpheus has no style field: emotion comes from the wording, punctuation, CAPS and its vocal tags
(<laugh> <chuckle> <sigh> <sniffle> <groan> <yawn> <gasp>). Our lines.json tags are mapped onto those.
Clips whose text and settings haven't changed are skipped; progress is saved as it goes.
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_index import LINES, NAMES, ROOT, VOICES, write_index  # noqa: E402

OUT = VOICES / "en"
SAMPLES = ROOT / ".voicegen/samples/en"
LEADING_PUNCT = "…。！？、!?., "
MODEL = "orpheus-3b-0.1-ft-q4_k_m"
TRIM = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse")
# lines.json uses a wider tag set; map to what Orpheus was trained on ("" drops the tag).
TAGS = {
    "giggle": "<chuckle>", "laugh": "<laugh>", "cheer": "<laugh>", "chuckle": "<chuckle>",
    "sigh": "<sigh>", "whimper": "<sniffle>", "grr": "<groan>", "pff": "<sigh>", "tsk": "",
    "yawn": "<yawn>", "gasp": "<gasp>", "breath": "", "short pause": "...",
}


def orpheus_text(text: str) -> str:
    def sub(m):
        return TAGS.get(m.group(1).lower(), "")
    text = re.sub(r"<([^>]+)>", sub, text)
    return re.sub(r"\s{2,}", " ", text).strip()


def to_mp3(pcm, rate: int, dest: Path, tail: float):
    dest.parent.mkdir(parents=True, exist_ok=True)
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


def jobs(sample: bool, gid: str):
    """Yields (dest, text, tail) for one girl."""
    base = SAMPLES if sample else OUT
    hons = [h for h in LINES["honorifics"] if not sample or h["key"] == "kun"]
    names = [e for e in NAMES if not sample or e[1] == "baqar"]
    for lkey, line in LINES["lines"][gid].items():
        if sample and lkey not in ("love", "angry", "miss", "shy"):
            continue
        assert line["en"].startswith("{n}"), f"{gid}.{lkey} en must start with {{n}}"
        rest = line["en"][len("{n}"):]
        for hon in hons:
            text = f"{hon['enSpeak']}{rest}".lstrip(LEADING_PUNCT)
            if text[:1].isalpha():
                text = text[0].upper() + text[1:]
            yield base / gid / "lines" / f"{lkey}_{hon['key']}.mp3", orpheus_text(text), 0.15
    for entry in names:
        spelling = entry[1].capitalize()
        for tone, punct in (("soft", "..."), ("loud", "!")):
            yield base / gid / "names" / f"{entry[1]}_{tone}.mp3", spelling + punct, 0.04


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true", help="Only make a few clips into .voicegen/samples/en")
    ap.add_argument("--girl", choices=list(LINES["girls"]), help="Only this girl (lets CI run girls in parallel)")
    args = ap.parse_args()

    import llama_cpp
    import orpheus_cpp.model as om  # imported late so --help works without it

    # orpheus-cpp asks llama.cpp for the model's full 131K context (n_ctx=0), which reserves ~15 GB.
    # One short line needs a tiny fraction of that.
    llama_init = llama_cpp.Llama.__init__

    def small_ctx_init(self, *a, **kw):
        llama_init(self, *a, **{**kw, "n_ctx": 2048})

    llama_cpp.Llama.__init__ = small_ctx_init
    orpheus = om.OrpheusCpp(n_gpu_layers=-1, lang="en", verbose=False)
    made = skipped = 0
    for gid in [args.girl] if args.girl else list(LINES["girls"]):
        cfg = LINES["girls"][gid]["enOrpheus"]
        # One progress file per girl, so parallel CI jobs never clash.
        manifest_path = OUT / gid / "manifest.json"
        manifest = {} if args.sample or not manifest_path.exists() else json.loads(manifest_path.read_text())
        keep: set[str] = set()
        girl_jobs = list(jobs(args.sample, gid))
        print(f"{gid}: {len(girl_jobs)} clips to check", flush=True)

        for dest, text, tail in girl_jobs:
            rel = str(dest.relative_to((SAMPLES if args.sample else OUT) / gid))
            keep.add(rel)
            sig = hashlib.sha1(json.dumps([MODEL, text, cfg, tail, TRIM]).encode()).hexdigest()
            if manifest.get(rel) == sig and dest.exists():
                skipped += 1
                continue
            # Orpheus samples randomly and sometimes rambles or cuts off; retry when the length looks wrong.
            words = max(1, len(re.sub(r"<[^>]+>", "", text).split()))
            max_seconds = 1.5 + words * 0.75
            for attempt in range(4):
                rate, samples = orpheus.tts(text, options={
                    "voice_id": cfg["voice"], "temperature": cfg["temperature"],
                    # Orpheus emits ~85 audio tokens per second; stop runaway takes early instead of at 2048 tokens.
                    "max_tokens": int(max_seconds * 100) + 100,
                })
                pcm = samples.squeeze()
                seconds = len(pcm) / rate
                if 0.25 <= seconds <= max_seconds:
                    break
                print(f"  retry {gid}/{rel} ({seconds:.1f}s for {words} words)", flush=True)
            to_mp3(pcm, rate, dest, tail)
            manifest[rel] = sig
            made += 1
            if not args.sample:
                manifest_path.write_text(json.dumps(manifest, indent=0, sort_keys=True) + "\n")
            if made % 50 == 0:
                print(f"  {made} clips made...", flush=True)

        if not args.sample:
            # Remove this girl's clips that are no longer in the plan (old engines, renamed lines).
            for stale in (OUT / gid).rglob("*.mp3"):
                if str(stale.relative_to(OUT / gid)) not in keep:
                    stale.unlink()
            manifest = {k: v for k, v in manifest.items() if k in keep}
            manifest_path.write_text(json.dumps(manifest, indent=0, sort_keys=True) + "\n")

    print(f"Done: {made} made, {skipped} unchanged.")
    if args.sample:
        # Join name + line into ready-to-play previews, like the app does.
        listen = SAMPLES / "listen"
        listen.mkdir(parents=True, exist_ok=True)
        for gid in [args.girl] if args.girl else list(LINES["girls"]):
            for lkey in ("love", "angry", "miss", "shy"):
                tone = LINES["lines"][gid][lkey]["tone"]
                parts = [SAMPLES / gid / "names" / f"baqar_{tone}.mp3", SAMPLES / gid / "lines" / f"{lkey}_kun.mp3"]
                (listen / f"{gid}_{lkey}.mp3").write_bytes(b"".join(p.read_bytes() for p in parts))
        print(f"Samples in {listen}")
    elif not args.girl:
        write_index()


if __name__ == "__main__":
    main()
