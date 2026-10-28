"""Senpai Says name voice server: says any name the app doesn't have built in.

POST /name {"kana": "ザルヴィシュ"} -> a zip of <character>/<mood>.mp3, every character saying the
name in every mood, made exactly like the app's built-in name clips (scripts/voicegen.py).

Only katakana names up to 20 characters are accepted, so it can't be used as a general text-to-speech
service. Names are not written to disk or logged; recent results are kept briefly in memory so a popular
name isn't generated twice.
"""

import asyncio
import io
import json
import os
import re
import tempfile
import time
import zipfile
from collections import OrderedDict, defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from voicegen import NAME_POST, NAME_PRE, load_synth, name_variants, render, to_mp3

VV = Path(os.environ.get("VV_DIR", "vv"))
LINES = json.loads(Path(os.environ.get("LINES_JSON", "lines.json")).read_text())
KANA = re.compile(r"^[ァ-ヶー・]{1,20}$")
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_HOUR", "20"))
CACHE_SIZE = 200

app = FastAPI(title="Senpai Says name voices", docs_url=None, redoc_url=None)
# The phone app doesn't need CORS; the web preview (another origin) does.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
synths, styles = load_synth(VV, LINES["girls"])
busy = asyncio.Semaphore(1)  # one name at a time; each uses every core
cache: OrderedDict[str, bytes] = OrderedDict()
hits: dict[str, deque] = defaultdict(deque)


class NameRequest(BaseModel):
    kana: str


def client_ip(request: Request) -> str:
    # Hugging Face sits behind a proxy; the first forwarded address is the device.
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def allow(ip: str) -> bool:
    now = time.time()
    q = hits[ip]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        return False
    q.append(now)
    return True


def render_character(gid: str, kana: str, tmp: Path) -> list[tuple[Path, str]]:
    girl = LINES["girls"][gid]
    out = []
    for mood, text, style, tune in name_variants(LINES, girl, kana):
        sid = styles[(girl["speaker"], style)]
        dest = tmp / f"{gid}_{mood}.mp3"
        to_mp3(render(synths[girl["speaker"]], sid, girl, text, tune, NAME_PRE, NAME_POST), dest)
        out.append((dest, f"{gid}/{mood}.mp3"))
    return out


def make_zip(kana: str) -> bytes:
    buf = io.BytesIO()
    with tempfile.TemporaryDirectory() as tmp:
        # Each character has its own synthesizer, so they can render side by side.
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 2) as pool:
            parts = list(pool.map(lambda gid: render_character(gid, kana, Path(tmp)), LINES["girls"]))
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
            for files in parts:
                for path, name in files:
                    z.write(path, name)
    return buf.getvalue()


@app.on_event("startup")
async def warm_up():
    # Voice models load on first use; do it now so the first real name isn't slower.
    asyncio.get_running_loop().run_in_executor(None, make_zip, "テスト")


@app.get("/")
def health():
    return {"ok": True, "characters": list(LINES["girls"]), "moods": [m for m in LINES["nameMoods"] if not m.startswith("_")]}


@app.post("/name")
async def name(req: NameRequest, request: Request):
    kana = req.kana.strip()
    if not KANA.match(kana):
        raise HTTPException(400, "Send the name's reading in katakana (up to 20 characters).")
    if kana in cache:
        cache.move_to_end(kana)
        return Response(cache[kana], media_type="application/zip")
    if not allow(client_ip(request)):
        raise HTTPException(429, "Too many names from this device. Try again in an hour.")
    async with busy:
        data = await asyncio.to_thread(make_zip, kana)
    cache[kana] = data
    if len(cache) > CACHE_SIZE:
        cache.popitem(last=False)
    return Response(data, media_type="application/zip")
