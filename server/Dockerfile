# Senpai Says name voice server, built and run by Hugging Face Spaces (Docker SDK, port 7860).
# scripts/deploy_name_server.sh copies voicegen.py and lines.json next to this file before uploading.
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# VOICEVOX runtime, dictionary, and only the voice models the characters use (see lines.json speakers).
ARG VV=https://github.com/VOICEVOX
RUN mkdir -p vv/onnxruntime vv/dict vv/models/vvms \
 && curl -fsSL $VV/onnxruntime-builder/releases/download/voicevox_onnxruntime-1.17.3/voicevox_onnxruntime-linux-x64-1.17.3.tgz \
    | tar xz -C vv/onnxruntime --strip-components=1 \
 && curl -fsSL https://github.com/r9y9/open_jtalk/releases/download/v1.11.1/open_jtalk_dic_utf_8-1.11.tar.gz \
    | tar xz -C vv/dict \
 && for n in 0 4 5 8 9 10 13 15 19 21 24; do \
      curl -fsSL -o vv/models/vvms/$n.vvm $VV/voicevox_vvm/releases/download/0.17.0/$n.vvm; \
    done

COPY app.py voicegen.py lines.json ./

# Spaces run containers as user 1000.
RUN useradd -m -u 1000 user && chown -R user /app
USER user

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--no-access-log"]
