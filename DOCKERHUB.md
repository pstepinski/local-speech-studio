# Local Speech Studio

Local Speech Studio is a self-hosted speech workspace with a browser interface,
multilingual text-to-speech powered by Chatterbox, and speech-to-text powered
by Whisper Large V3 Turbo.

Source code, issue tracker, and complete documentation:
[github.com/pstepinski/local-speech-studio](https://github.com/pstepinski/local-speech-studio)

## Images

| Image | Purpose | Container port |
| --- | --- | ---: |
| [`pstepinski/local-speech-studio-gui`](https://hub.docker.com/r/pstepinski/local-speech-studio-gui) | Web interface and reverse proxy | `8080` |
| [`pstepinski/local-speech-studio-tts`](https://hub.docker.com/r/pstepinski/local-speech-studio-tts) | Chatterbox multilingual TTS API | `8000` |
| [`pstepinski/local-speech-studio-stt`](https://hub.docker.com/r/pstepinski/local-speech-studio-stt) | Whisper Large V3 Turbo STT API | `8001` |

The images target `linux/amd64`. The TTS and STT images use NVIDIA CUDA and
require an NVIDIA driver plus the NVIDIA Container Toolkit on the host.

## Quick start with Docker Compose

Clone the project so that you get the tested Compose configuration:

```bash
git clone https://github.com/pstepinski/local-speech-studio.git
cd local-speech-studio
docker compose pull
docker compose up -d
```

The default addresses are:

- GUI: <http://localhost:8080>
- TTS OpenAPI: <http://localhost:8000/docs>
- STT OpenAPI: <http://localhost:8001/docs>

Check startup progress and readiness:

```bash
docker compose logs -f tts stt
docker compose ps
```

All three containers are ready when their status is `healthy`.

## Custom ports and GPU assignments

The default configuration assigns TTS to GPU 0 and STT to GPU 1. Host ports
and GPU IDs can be changed without modifying `compose.yaml`:

```bash
GUI_PORT=18080 \
CHATTERBOX_PORT=18000 \
WHISPER_PORT=18001 \
TTS_GPU_ID=0 \
STT_GPU_ID=1 \
docker compose up -d
```

With these values, open the GUI at <http://localhost:18080>.

## Model storage

Model weights are not embedded in the images. On first startup, TTS and STT
download their models from Hugging Face into the shared named volume
`local-speech-studio-model-cache`. A normal `docker compose down` preserves
this volume, so later startups reuse the downloaded models.

Stop and remove the containers while preserving models:

```bash
docker compose down
```

Remove the containers and downloaded model data:

```bash
docker compose down -v
```

## API examples

Generate Polish speech:

```bash
curl -X POST http://localhost:8000/v1/speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"Cześć! To jest test polskiego lektora.","language":"pl"}' \
  --output speech.wav
```

Transcribe an audio file with automatic language detection:

```bash
curl -X POST http://localhost:8001/v1/transcriptions \
  -F 'file=@recording.wav' \
  -F 'language=auto'
```

## Health checks

```bash
curl http://localhost:8080/health
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## License

Local Speech Studio is distributed under the
[MIT License](https://github.com/pstepinski/local-speech-studio/blob/main/LICENSE).
