#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$PROJECT_DIR/.run"

stop_service() {
    local name="$1"
    local application="$2"
    local pid_file="$3"

    if [[ ! -f "$pid_file" ]]; then
        echo "$name nie działa (brak pliku PID)."
        return
    fi

    local service_pid
    service_pid="$(<"$pid_file")"
    if [[ ! "$service_pid" =~ ^[0-9]+$ ]]; then
        echo "Nieprawidłowy plik PID dla $name — pomijam." >&2
        return 1
    fi

    if ! kill -0 "$service_pid" 2>/dev/null; then
        echo "$name już nie działa. Usuwam nieaktualny plik PID."
        rm -f "$pid_file"
        return
    fi

    local command
    command="$(ps -p "$service_pid" -o args= 2>/dev/null || true)"
    if [[ "$command" != *"uvicorn $application"* ]]; then
        echo "PID $service_pid należy do innego procesu; $name nie zostanie zatrzymany." >&2
        return 1
    fi

    echo "Zatrzymywanie $name (PID: $service_pid)..."
    kill "$service_pid"
    for _ in {1..20}; do
        if ! kill -0 "$service_pid" 2>/dev/null; then
            rm -f "$pid_file"
            echo "$name został zatrzymany."
            return
        fi
        sleep 0.5
    done

    echo "$name nie zakończył się na SIGTERM; wysyłam SIGKILL." >&2
    kill -KILL "$service_pid"
    rm -f "$pid_file"
    echo "$name został zatrzymany w sposób wymuszony."
}

stop_service "Whisper STT" "stt_app.main:app" "$RUNTIME_DIR/whisper.pid"
stop_service "Chatterbox TTS" "app.main:app" "$RUNTIME_DIR/chatterbox.pid"
stop_service "Speech Studio GUI" "gui_app.main:app" "$RUNTIME_DIR/gui.pid"

