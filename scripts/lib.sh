#!/usr/bin/env bash
# Shared helpers for the scripts/ folder. Source this, do not execute it.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/.local"
mkdir -p "$LOCAL/logs" "$LOCAL/pids"

load_env() {
  [ -f "$ROOT/.env" ] || cp "$ROOT/.env.example" "$ROOT/.env"
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
}

wait_http() { # url, seconds
  local url="$1" tries="${2:-60}" i
  for ((i = 0; i < tries; i++)); do
    curl -fsS -o /dev/null "$url" 2>/dev/null && return 0
    sleep 1
  done
  echo "timed out waiting for $url" >&2
  return 1
}

start_bg() { # name, command...
  local name="$1"
  shift
  nohup "$@" >"$LOCAL/logs/$name.log" 2>&1 &
  echo $! >"$LOCAL/pids/$name.pid"
  echo "started $name (pid $!)"
}
