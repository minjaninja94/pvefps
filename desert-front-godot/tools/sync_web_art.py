#!/usr/bin/env python3
"""Copy browser art into an isolated Godot asset folder without modifying original files.

Use from any working directory: python3 desert-front-godot/tools/sync_web_art.py
Requires a checkout of the pvefps repository, with both desert-strike/ and desert-front-godot/.
"""
from __future__ import annotations

import shutil
from pathlib import Path

GAME = Path(__file__).resolve().parents[1]
REPO = GAME.parent
SOURCE = REPO / "desert-strike" / "assets" / "sprites"
DEST = GAME / "assets" / "sprites"
FACTIONS = ("forge", "brood", "astral", "marine", "beastkin",
            "elf", "furry", "robot", "octoper", "fairy")


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    names = [f"uniform-{f}-{role}.webp" for f in FACTIONS for role in range(8)]
    names += [f"{f}-banner.webp" for f in FACTIONS]
    for name in names:
        source = SOURCE / name
        if not source.is_file():
            raise FileNotFoundError(f"Original web art missing: {source}")
        with source.open("rb") as handle:
            header = handle.read(12)
        if not (header.startswith(b"RIFF") and header[8:12] == b"WEBP"):
            raise ValueError(f"Invalid WebP file: {source}")
        shutil.copy2(source, DEST / name)
    count = len([p for p in DEST.glob("*.webp") if p.name in names])
    if count != len(names):
        raise RuntimeError(f"Expected {len(names)} art files, copied {count}")
    print(f"Desert Front Godot: synchronized {len(names)} WebP assets from web source.")
    print(f"Source never modified: {SOURCE}")


if __name__ == "__main__":
    main()
