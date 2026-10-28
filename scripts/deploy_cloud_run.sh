#!/usr/bin/env bash
# Deploys the name voice server (server/ + scripts/voicegen.py + src/data/lines.json) to Google Cloud Run.
# Re-run after changing voices or lines.json so custom names keep matching the built-in clips.
# Needs the gcloud CLI signed in (`gcloud auth login`) with the project selected.
# Usage: scripts/deploy_cloud_run.sh [service-name] [region]
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICE="${1:-senpai-voice}"
REGION="${2:-us-central1}" # a free-tier region
PROJECT=$(gcloud config get-value project 2>/dev/null)
[ -n "$PROJECT" ] || { echo "Run: gcloud config set project <your-project>"; exit 1; }

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT"

BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
cp server/Dockerfile server/app.py server/requirements.txt "$BUILD/"
cp scripts/voicegen.py src/data/lines.json "$BUILD/"

# Scales to zero when idle; at most 2 copies, so a traffic spike can't run up a bill.
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source "$BUILD" \
  --port 7860 \
  --cpu 2 --memory 2Gi \
  --concurrency 1 --min-instances 0 --max-instances 2 \
  --timeout 300 \
  --allow-unauthenticated \
  --quiet

URL=$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')
echo "Name voice server: $URL"
echo "Set it as the GitHub secret NAME_VOICE_URL (and EXPO_PUBLIC_NAME_VOICE_URL for local release builds)."
