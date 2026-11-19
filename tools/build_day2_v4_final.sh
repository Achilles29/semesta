#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
base="public/audio/produksi/episode-003/release-v4-election"
test -s "$base/day2-visual-assembled.mp4"
test -s "$base/day2-master.wav"
test -s "$base/subtitles.srt"
ffmpeg -y -hide_banner -loglevel error \
  -i "$base/day2-visual-assembled.mp4" -i "$base/day2-master.wav" \
  -vf "subtitles=$base/subtitles.srt:force_style='FontName=DejaVu Sans,FontSize=10,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00132E37,BorderStyle=1,Outline=0.7,Shadow=0.3,Alignment=2,MarginV=34'" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart -shortest "$base/day2-final-v4-20261118.mp4"
ffmpeg -y -hide_banner -loglevel error -ss 0.6 \
  -i "$base/day2-final-v4-20261118.mp4" -frames:v 1 "$base/day2-cover-v4.png"
