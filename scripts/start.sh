#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$PROJECT_DIR/.run"
HOST="${SPEECH_HOST:-0.0.0.0}"
GUI_PORT="${GUI_PORT:-8080}"
TTS_PORT="${CHATTERBOX_PORT:-8000}"
STT_PORT="${WHISPER_PORT:-8001}"
export WHISPER_WAKE_PHRASE="${WHISPER_WAKE_PHRASE:-OK Studio!}"
export GUI_TTS_UPSTREAM_URL="${GUI_TTS_UPSTREAM_URL:-http://localhost:$TTS_PORT}"
export GUI_STT_UPSTREAM_URL="${GUI_STT_UPSTREAM_URL:-http://localhost:$STT_PORT}"
export GUI_ENABLE_TTS="${GUI_ENABLE_TTS:-true}"
export GUI_ENABLE_STT="${GUI_ENABLE_STT:-true}"
export GUI_ENABLE_CONTINUOUS="${GUI_ENABLE_CONTINUOUS:-true}"

mkdir -p "$RUNTIME_DIR"

if command -v uv >/dev/null 2>&1; then
    UV_BIN="$(command -v uv)"
elif [[ -x "${HOME}/.local/bin/uv" ]]; then
    UV_BIN="${HOME}/.local/bin/uv"
else
    echo "Nie znaleziono uv. Zainstaluj je poleceniem:" >&2
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
    exit 1
fi

cd "$PROJECT_DIR"

echo "Sprawdzanie środowiska..."
"$UV_BIN" sync --extra dev --python 3.11

start_service() {
    local name="$1"
    local application="$2"
    local port="$3"
    local pid_file="$4"
    local log_file="$5"

    if [[ -f "$pid_file" ]]; then
        local existing_pid
        existing_pid="$(<"$pid_file")"
        if [[ "$existing_pid" =~ ^[0-9]+$ ]] && kill -0 "$existing_pid" 2>/dev/null; then
            local command
            command="$(ps -p "$existing_pid" -o args= 2>/dev/null || true)"
            if [[ "$command" == *"uvicorn $application"* ]]; then
                echo "$name już działa (PID: $existing_pid, port: $port)."
                return
            fi
            echo "PID $existing_pid z $pid_file należy do innego procesu." >&2
            return 1
        fi
        rm -f "$pid_file"
    fi

    echo "Uruchamianie $name w tle..."
    : >"$log_file"
    nohup setsid "$PROJECT_DIR/.venv/bin/uvicorn" "$application" \
        --host "$HOST" --port "$port" >>"$log_file" 2>&1 </dev/null &
    local service_pid=$!
    echo "$service_pid" >"$pid_file"

    sleep 2
    if ! kill -0 "$service_pid" 2>/dev/null; then
        echo "Nie udało się uruchomić $name. Ostatnie wpisy logu:" >&2
        tail -n 30 "$log_file" >&2
        rm -f "$pid_file"
        return 1
    fi
    echo "$name działa w tle (PID: $service_pid, port: $port)."
}

start_service \
    "Speech Studio GUI" "gui_app.main:app" "$GUI_PORT" \
    "$RUNTIME_DIR/gui.pid" "$RUNTIME_DIR/gui.log"
start_service \
    "Chatterbox TTS" "app.main:app" "$TTS_PORT" \
    "$RUNTIME_DIR/chatterbox.pid" "$RUNTIME_DIR/chatterbox.log"
start_service \
    "Whisper STT" "stt_app.main:app" "$STT_PORT" \
    "$RUNTIME_DIR/whisper.pid" "$RUNTIME_DIR/whisper.log"

echo "GUI:         http://localhost:$GUI_PORT/"
echo "TTS API:     http://localhost:$TTS_PORT/docs"
echo "STT API:     http://localhost:$STT_PORT/docs"
echo "Zakładki:    TTS=$GUI_ENABLE_TTS STT=$GUI_ENABLE_STT ciągły=$GUI_ENABLE_CONTINUOUS"
echo "Fraza aktyw.: $WHISPER_WAKE_PHRASE"
echo "Log GUI:     $RUNTIME_DIR/gui.log"
echo "Log TTS:     $RUNTIME_DIR/chatterbox.log"
echo "Log STT:     $RUNTIME_DIR/whisper.log"
echo "Modele mogą nadal ładować wagi; gotowość sprawdzisz przez endpointy /health."

