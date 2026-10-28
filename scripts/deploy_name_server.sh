#!/usr/bin/env bash
# Uploads server/ (with scripts/voicegen.py and src/data/lines.json) to the Hugging Face Space that
# makes custom name voices. Re-run after changing voices or lines.json so custom names keep matching.
# Needs a write token as HF_TOKEN=... in .env.local. Usage: scripts/deploy_name_server.sh [space-name]
set -euo pipefail
cd "$(dirname "$0")/.."

SPACE="${1:-senpai-voice}"
TOKEN=$(grep -E '^HF_TOKEN=' .env.local | head -1 | cut -d= -f2- | tr -d "\"' \r")
[ -n "$TOKEN" ] || { echo "Add HF_TOKEN=... to .env.local first"; exit 1; }
HF_USER=$(curl -fsS -H "Authorization: Bearer $TOKEN" https://huggingface.co/api/whoami-v2 \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["name"])')

# Create the Space once. Public, because the app calls it without a token. Already existing is fine.
curl -sS -o /dev/null -X POST https://huggingface.co/api/repos/create \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"type\":\"space\",\"name\":\"$SPACE\",\"sdk\":\"docker\",\"private\":false}"

BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
git clone -q "https://user:$TOKEN@huggingface.co/spaces/$HF_USER/$SPACE" "$BUILD/space" 2>/dev/null
cp server/Dockerfile server/app.py server/requirements.txt server/README.md "$BUILD/space/"
cp scripts/voicegen.py src/data/lines.json "$BUILD/space/"

cd "$BUILD/space"
git add -A
if git diff --cached --quiet; then
  echo "Space is already up to date"
  exit 0
fi
git -c user.name="Senpai Says deploy" -c user.email="deploy@senpaisays.invalid" commit -qm "Deploy name server"
git push -q origin HEAD 2>&1 | sed "s/$TOKEN/***/g"
echo "Deployed: https://huggingface.co/spaces/$HF_USER/$SPACE"
echo "API:      https://$HF_USER-$SPACE.hf.space"
