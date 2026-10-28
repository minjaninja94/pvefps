#!/usr/bin/env python3
"""Package a Godot Windows export as the embedded launcher's payload."""
import hashlib
import sys
import zipfile
from pathlib import Path

project = Path(__file__).resolve().parents[1]
build = project / "build"
launcher = project / "launcher"
required = [
    "DesertFront.exe",
    "DesertFront.pck",
    "online_relay.cfg",
    "addons/nodetunnel/bin/nodetunnel.dll",
    "THIRD_PARTY_LICENSES/NodeTunnel_LICENSE.txt",
]
for name in required:
    file = build / name
    if not file.is_file() or not file.stat().st_size:
        raise SystemExit(f"Missing Windows payload file: {name}")
target = launcher / "payload.zip"
with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    files = required + ["firebase_public.cfg", "nodetunnel.dll"]
    for name in files:
        path = build / name
        if path.is_file():
            archive.write(path, name)
with zipfile.ZipFile(target) as archive:
    for name in required:
        if name not in archive.namelist():
            raise SystemExit(f"Payload verification failed: {name}")
print(f"Payload: {target.stat().st_size} bytes, SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}")
