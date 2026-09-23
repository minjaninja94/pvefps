#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 5 ] || [ "$#" -gt 7 ]; then
  echo "usage: $0 INPUT OUTPUT COLUMNS ROWS CELL_SIZE [TOP:BOTTOM,...] [COLUMN_OVERLAP]" >&2
  exit 2
fi

input=$1
output=$2
columns=$3
rows=$4
cell_size=$5
row_windows=${6:-}
column_overlap=${7:-0}
padding=8
inner_size=$((cell_size-padding*2))
work_dir=$(mktemp -d /tmp/goablo-atlas.XXXXXX)
trap 'rm -rf -- "$work_dir"' EXIT

read -r source_width source_height < <(identify -format '%w %h\n' "$input")
IFS=',' read -r -a custom_windows <<< "$row_windows"
for ((row=0; row<rows; row++)); do
  if [ -n "$row_windows" ]; then
    IFS=':' read -r top bottom <<< "${custom_windows[$row]}"
  else
    top=$((row*source_height/rows))
    bottom=$(((row+1)*source_height/rows))
  fi
  for ((column=0; column<columns; column++)); do
    left=$((column*source_width/columns-column_overlap))
    right=$(((column+1)*source_width/columns+column_overlap))
    ((left<0)) && left=0
    ((right>source_width)) && right=$source_width
    index=$((row*columns+column))
    convert "$input" -crop "$((right-left))x$((bottom-top))+${left}+${top}" +repage "$work_dir/raw-$(printf '%03d' "$index").png"
  done
done

for ((row=0; row<rows; row++)); do
  max_width=1
  max_height=1
  for ((column=0; column<columns; column++)); do
    index=$((row*columns+column))
    read -r width height < <(convert "$work_dir/raw-$(printf '%03d' "$index").png" -trim -format '%w %h\n' info:)
    ((width>max_width)) && max_width=$width
    ((height>max_height)) && max_height=$height
  done
  scale=$(awk -v inner="$inner_size" -v width="$max_width" -v height="$max_height" 'BEGIN { a=inner/width; b=inner/height; printf "%.6f", (a<b?a:b)*100 }')
  row_cells=()
  for ((column=0; column<columns; column++)); do
    index=$((row*columns+column))
    raw="$work_dir/raw-$(printf '%03d' "$index").png"
    cell="$work_dir/cell-$(printf '%03d' "$index").png"
    convert "$raw" -trim +repage -filter Lanczos -resize "${scale}%" -background none -gravity south -extent "${cell_size}x${cell_size}" "$cell"
    row_cells+=("$cell")
  done
  montage "${row_cells[@]}" -tile "${columns}x1" -geometry +0+0 -background none "$work_dir/row-$(printf '%03d' "$row").png"
done

row_images=()
for ((row=0; row<rows; row++)); do
  row_images+=("$work_dir/row-$(printf '%03d' "$row").png")
done
montage "${row_images[@]}" -tile "1x${rows}" -geometry +0+0 -background none "$output"
convert "$output" -strip "$output"
