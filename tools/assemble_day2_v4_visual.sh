#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
base="public/audio/produksi/episode-003/release-v4-election"
test -s "$base/day2-visual.mp4"
test -s "$base/day2-patch-2486-3113.mp4"
ffmpeg -y -hide_banner -loglevel error \
  -i "$base/day2-visual.mp4" -i "$base/day2-patch-2486-3113.mp4" \
  -filter_complex '[0:v]trim=start_frame=0:end_frame=2486,setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v]' \
  -map '[v]' -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p \
  -r 24 -movflags +faststart "$base/day2-visual-assembled.mp4"
