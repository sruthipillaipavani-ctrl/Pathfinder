#!/bin/sh
# Double-click this file (or run ./start.command) to open Pathfinder on your laptop.
cd "$(dirname "$0")"
PORT=8000
echo "Pathfinder is running at http://localhost:$PORT  (press Ctrl+C to stop)"
(sleep 1 && open "http://localhost:$PORT") &
python3 -m http.server "$PORT" --bind 127.0.0.1
