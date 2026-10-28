#!/usr/bin/env python3
"""Compare a fixed web/native battle at selected economy and combat checkpoints."""
import json
import os
import subprocess
from pathlib import Path

project = Path(__file__).resolve().parents[1]
repo = project.parent

def dump(command, cwd):
    proc = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=90, check=True)
    for line in proc.stdout.splitlines():
        if line.startswith("PARITY_JSON="):
            return json.loads(line.partition("=")[2])
    raise RuntimeError(f"Missing parity output from {command}: {proc.stdout} {proc.stderr}")

web = dump([os.environ.get("NODE_BIN", "node"), str(project / "tests/parity_web.cjs")], repo)
native = dump([os.environ.get("GODOT_BIN", "godot"), "--headless", "--path", str(project), "--script", "res://tests/parity_dump.gd"], repo)
assert len(web) == len(native), (len(web), len(native))
for a, b in zip(web, native):
    for key in ("step", "wave", "cash", "cores", "turrets", "forwardHP"):
        assert a[key] == b[key], (a["step"], key, a[key], b[key])
    assert abs(a["next"] - b["next"]) < 0.0001, (a["step"], "next", a["next"], b["next"])
    assert len(a["units"]) == len(b["units"]), (a["step"], "units", a["units"], b["units"])
    for left, right in zip(a["units"], b["units"]):
        assert left["team"] == right["team"] and left["role"] == right["role"]
        assert abs(left["hp"] - right["hp"]) < 0.01, (a["step"], "hp", left, right)
        assert abs(left["x"] - right["x"]) < 1, (a["step"], "x", left, right)
print(f"Combat parity: {len(web)} checkpoints; income, wave, buildings, movement, and unit damage match")
