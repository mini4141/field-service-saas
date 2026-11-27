#!/usr/bin/env bash
# Stops the local app processes; pass nothing to also stop the compose services.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"

for f in "$LOCAL"/pids/*.pid; do
  [ -f "$f" ] || continue
  pid=$(cat "$f")
  kill "$pid" 2>/dev/null || true
  # On Windows the MSYS pid may differ from the node.exe pid, so also free the ports.
  rm -f "$f"
done
for port in 4000 4100 3000 8081; do
  winpid=$(netstat -ano 2>/dev/null | grep -E "[:.]$port .*LISTENING" | awk '{print $NF}' | head -1 || true)
  [ -n "${winpid:-}" ] && taskkill //PID "$winpid" //F //T >/dev/null 2>&1 || true
done
# the watcher has no port: match on its command line
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -match 'thumbnailer.src.watcher' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }" >/dev/null 2>&1 || true

if [ "${1:-}" != "--apps-only" ]; then
  docker compose down
fi
echo "stopped"
