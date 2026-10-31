# Lokalne studio mowy: Chatterbox TTS + Whisper STT

**Polski** | [English](README.md)

Lokalna usługa REST zamieniająca tekst na plik WAV za pomocą modelu
[Chatterbox Multilingual](https://github.com/resemble-ai/chatterbox). Obsługuje
23 języki, w tym polski (`pl`) i angielski (`en`). Tekst oraz dwuliterowy kod
języka są przekazywane w JSON-ie.

Druga usługa REST zamienia pliki audio i nagrania z mikrofonu na tekst za
pomocą lokalnego modelu
[Whisper Large V3 Turbo](https://huggingface.co/openai/whisper-large-v3-turbo).
GUI udostępnia oba kierunki w osobnych zakładkach.

## Wymagania

- Python 3.11 (zalecany przez Chatterbox),
- `uv`,
- przy pracy na GPU: zgodne środowisko CUDA.

Model działa również na CPU, ale generowanie jest wtedy znacznie wolniejsze.
Wagi modelu są pobierane do lokalnego cache Hugging Face podczas pierwszego
uruchomienia. Późniejsza synteza odbywa się lokalnie.

Długie teksty są automatycznie dzielone na fragmenty przy końcach zdań. Każdy
fragment jest generowany osobno, a usługa łączy je krótkimi pauzami w jeden WAV.
Ogranicza to szczytowe użycie pamięci GPU.

Projekt nadpisuje starsze przypięcie PyTorch pochodzące z Chatterbox i używa
PyTorch 2.12 z CUDA 13, aby obsłużyć karty NVIDIA Blackwell (`sm_120`), w tym
GeForce RTX 5060 Ti. Używany jest TorchAudio 2.11, którego oficjalna linia jest
zgodna z PyTorch 2.11 i nowszymi.

## Testowany zestaw

Projekt został przetestowany na następującym sprzęcie i systemie operacyjnym:

- system: Ubuntu 22.04.5 LTS, jądro Linux `6.8.0-110-generic`,
- CPU: Intel Core i9-14900K (`x86_64`, 32 procesory logiczne),
- GPU: 2 × NVIDIA GeForce RTX 5060 Ti z 16 GB VRAM każda,
- sterownik NVIDIA: `590.48.01`.

## Instalacja i uruchomienie

```bash
uv python install 3.11
uv sync --extra dev --python 3.11
cp .env.example .env
./scripts/start.sh
```

Skrypt uruchamia trzy osobne procesy: GUI (`gui_app.main:app`) na hoście
`0.0.0.0` i porcie 8080, REST TTS na porcie 8000 oraz REST STT na porcie 8001.
Sam synchronizuje środowisko, zapisuje osobne PID-y i logi:

```bash
./scripts/start.sh
```

Procesy pozostaną aktywne po zamknięciu terminala. Zatrzymanie wszystkich
trzech usług:

```bash
./scripts/stop.sh
```

GUI jest uruchamiane na komputerze, na którym wykonano `./scripts/start.sh`, i
nasłuchuje domyślnie na wszystkich jego interfejsach sieciowych (`0.0.0.0`). Na
tym samym komputerze jest dostępne pod <http://localhost:8080/>, a z innego
urządzenia w tej samej sieci pod `http://<adres-IP-komputera>:8080/`. Port można
zmienić przez `GUI_PORT`, a adres nasłuchiwania przez `SPEECH_HOST`.

Dokumentacja OpenAPI TTS jest dostępna pod <http://localhost:8000/docs>, a STT
pod <http://localhost:8001/docs>.
Odtwarzacz TTS pozwala wybrać prędkość od `0,5×` do `2×`. Zakładka STT przyjmuje
plik audio albo nagranie bezpośrednio z mikrofonu.

Trzecia zakładka oferuje ciągły nasłuch mikrofonu. Krótkie fragmenty zawierające
mowę są lokalnie sprawdzane przez Whisper. Po frazie aktywującej nagrywana jest
wypowiedź aż do około 1,4 sekundy ciszy, a wynik pojawia się w GUI.

Można wymusić urządzenie przez `CHATTERBOX_DEVICE=cuda` albo
`CHATTERBOX_DEVICE=cpu`. Opcjonalne `CHATTERBOX_VOICE_PROMPT` wskazuje lokalny
plik WAV z próbką głosu do sklonowania.

Urządzenie Whisper ustawia `WHISPER_DEVICE`. Na komputerze z dwiema kartami
warto użyć `CHATTERBOX_DEVICE=cuda` oraz `WHISPER_DEVICE=cuda:1`, aby każdy model
pracował na osobnym GPU. Pierwszy start pobiera około 1,6 GB wag Whisper.

Domyślna fraza aktywująca to `OK Studio!`. Można ją ustawić podczas startu:

```bash
WHISPER_WAKE_PHRASE="OK Studio!" ./scripts/start.sh
```

Można też zmienić `WHISPER_WAKE_PHRASE` w `.env` lub wartość domyślną w
`scripts/start.sh`. Po zmianie trzeba zrestartować usługi. Dostęp do mikrofonu
wymaga zgody użytkownika oraz bezpiecznego kontekstu: `localhost` albo HTTPS.

GUI przekazuje żądania do TTS i STT przez własne endpointy `/api/tts` oraz
`/api/stt`. Przeglądarka nie łączy się bezpośrednio z portami 8000 i 8001, więc
GUI otwarte z innego komputera nie próbuje używać jego `localhost`. Adresy
usług docelowych oraz widoczność zakładek można skonfigurować podczas startu.
Podczas ładowania modeli proxy może przejściowo zwracać 502; GUI ponawia wtedy
kontrolę stanu i pobranie konfiguracji co 5 sekund:

```bash
GUI_TTS_UPSTREAM_URL="http://serwer:8000" \
GUI_STT_UPSTREAM_URL="http://serwer:8001" \
GUI_ENABLE_TTS=true \
GUI_ENABLE_STT=true \
GUI_ENABLE_CONTINUOUS=false \
./scripts/start.sh
```

Flagi przyjmują wartości `true` albo `false`. Zakładka ciągłego nasłuchu wymaga
włączonego STT. Konfigurację można też zapisać w `.env`.

## Użycie

Polski:

```bash
curl -X POST http://localhost:8000/v1/speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"Cześć! To jest test polskiego lektora.","language":"pl"}' \
  --output lektor-pl.wav
```

Angielski:

```bash
curl -X POST http://localhost:8000/v1/speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hello! This is a test of the English narrator.","language":"en"}' \
  --output narrator-en.wav
```

Transkrypcja z automatycznym wykryciem języka:

```bash
curl -X POST http://localhost:8001/v1/transcriptions \
  -F 'file=@nagranie.wav' \
  -F 'language=auto'
```

Parametr `language` może mieć wartość `auto`, `pl` albo `en`. Limit pliku wynosi
domyślnie 100 MB i można go zmienić przez `WHISPER_MAX_UPLOAD_MB`.

## Docker Compose

Projekt zawiera trzy niezależne obrazy: `gui`, `tts` oraz `stt`. Do kontenerów
GPU wymagane są sterownik NVIDIA i NVIDIA Container Toolkit. Pełny zestaw
uruchamia jedno polecenie:

- [`pstepinski/local-speech-studio-gui`](https://hub.docker.com/r/pstepinski/local-speech-studio-gui),
- [`pstepinski/local-speech-studio-tts`](https://hub.docker.com/r/pstepinski/local-speech-studio-tts),
- [`pstepinski/local-speech-studio-stt`](https://hub.docker.com/r/pstepinski/local-speech-studio-stt).

```bash
docker compose up
```

Docker Compose korzysta z opublikowanych obrazów z Docker Hub. Można je też
zbudować lokalnie poleceniem `docker compose build`. Przy pierwszym uruchomieniu
kontenerów usługi pobierają z Hugging Face wymagane modele:

- Chatterbox Multilingual dla usługi TTS,
- Whisper Large V3 Turbo dla usługi STT.

Nie trzeba pobierać ani kopiować wag ręcznie. Pierwszy start może potrwać kilka
minut i wymaga dostępu do internetu. Postęp pobierania oraz uruchamiania modeli
można obserwować poleceniem:

```bash
docker compose logs -f tts stt
```

GUI działa w kontenerze `gui`; jego port 8080 jest domyślnie publikowany na
porcie 8080 hosta. Na hoście jest więc dostępne pod <http://localhost:8080/>, a
z innego urządzenia pod `http://<adres-IP-hosta>:8080/`. Kontener GUI działa
również jako reverse proxy: `/api/tts` kieruje do `http://tts:8000`, a
`/api/stt` do `http://stt:8001` w sieci Compose. Nie trzeba wpisywać adresu IP
hosta do konfiguracji GUI. Zmiana `GUI_PORT` zmienia port hosta, nie port 8080
wewnątrz kontenera. Gotowość kontenerów można sprawdzić poleceniem:

```bash
docker compose ps
```

Usługi są gotowe, gdy kontenery `gui`, `tts` i `stt` mają status `healthy`.
Zatrzymanie i usunięcie kontenerów oraz sieci:

```bash
docker compose down
```

Wagi Chatterbox i Whisper są przechowywane we współdzielonym nazwanym wolumenie
`local-speech-studio-model-cache`, a nie w obrazach. Zwykłe `docker compose down`
zachowuje ten wolumen, więc kolejne `docker compose up` korzysta już z lokalnego
cache i nie pobiera ponownie całych modeli. Usunie go dopiero jawne
`docker compose down -v`; następny start po takim poleceniu ponownie pobierze
wagi.

Domyślnie TTS korzysta z GPU 0, a STT z GPU 1. Porty, karty i widoczność zakładek
można nadpisać przy starcie:

```bash
GUI_PORT=8080 \
CHATTERBOX_PORT=8000 \
WHISPER_PORT=8001 \
TTS_GPU_ID=0 \
STT_GPU_ID=1 \
GUI_ENABLE_CONTINUOUS=false \
docker compose up
```

Opcjonalne adresy `GUI_TTS_UPSTREAM_URL` i `GUI_STT_UPSTREAM_URL` muszą być
dostępne z kontenera `gui`, nie z przeglądarki. Domyślne nazwy `tts` i `stt` są
rozwiązywane w wewnętrznej sieci Compose.

Dodatkowe endpointy:

- `GET /health` — stan usługi TTS,
- `GET /languages` — obsługiwane kody języków.
- `GET http://localhost:8001/health` — model i urządzenie usługi STT.

## Testy

```bash
uv run pytest
```

Testy obejmują TTS po polsku i angielsku, dzielenie długich tekstów oraz REST
STT z przesyłaniem pliku. Używają dublerów modeli, więc nie pobierają wag.

## Autor

Projekt stworzył **Piotr Stępiński** — inżynier oprogramowania eksperymentujący
z vibe codingiem i lokalnymi modelami AI, syntezą mowy oraz rozpoznawaniem
głosu. Projekt był vibe'owany wspólnie z Codexem.

## Licencja

Projekt jest udostępniany na licencji MIT:

- [pełny tekst licencji w języku angielskim](LICENSE),
- [pełne polskie tłumaczenie](LICENSE.pl.md) — wyłącznie informacyjne.
