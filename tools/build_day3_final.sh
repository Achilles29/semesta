#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
base="public/audio/produksi/episode-004/${DAY3_RELEASE:-release-v1}"
master="${DAY3_MASTER:-day3-master.wav}"
output="${DAY3_OUTPUT:-day3-final.mp4}"
test -s "$base/day3-visual.mp4"
test -s "$base/$master"
test -s "$base/subtitles.srt"
ffmpeg -y -hide_banner -loglevel error \
  -i "$base/day3-visual.mp4" -i "$base/$master" \
  -vf "subtitles=$base/subtitles.srt:force_style='FontName=DejaVu Sans,FontSize=10,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00132E37,BorderStyle=1,Outline=0.7,Shadow=0.3,Alignment=2,MarginV=31'" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart -shortest "$base/$output"
