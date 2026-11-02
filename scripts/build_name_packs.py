#!/usr/bin/env python3
"""Zips the name clips that aren't bundled in the app: <out>/<lang>/<name>.zip, one per name.

Inside each zip: <girl>/<mood>.mp3. The app fetches them on first use (src/lib/namePacks.ts).
"""

import argparse
import zipfile
from pathlib import Path

from voice_index import BUNDLED_NAMES, HIDDEN_CHARACTERS, LANGS, LINES, NAME_VARIANTS, NAMES_BY_LANG, VOICES


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    out = ap.parse_args().out
    girls = [g for g in LINES["girls"] if g not in HIDDEN_CHARACTERS]
    count = 0
    for lang in LANGS:
        (out / lang).mkdir(parents=True, exist_ok=True)
        for entry in NAMES_BY_LANG[lang]:
            if entry[1] in BUNDLED_NAMES:
                continue
            with zipfile.ZipFile(out / lang / f"{entry[1]}.zip", "w", zipfile.ZIP_STORED) as z:
                for g in girls:
                    for mood in NAME_VARIANTS[lang]:
                        z.write(VOICES / lang / g / "names" / f"{entry[1]}_{mood}.mp3", f"{g}/{mood}.mp3")
            count += 1
    print(f"{count} name packs in {out}")


if __name__ == "__main__":
    main()
