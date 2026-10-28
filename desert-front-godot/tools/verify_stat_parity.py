#!/usr/bin/env python3
"""Compare all 80 web-engine fallback unit stats to the native Godot roster.

Requires node and Godot 4.3, not Firebase. Source files are read-only.
"""
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
node_script = r"""
require('./desert-strike/tri-lane-engine.js');
const g = globalThis.DesertTriEngine;
const arr = [];
for (let f=0; f<10; f++) for (let r=0; r<8; r++) {
  const d = g.definition(f,r);
  arr.push({f,r,hp:d.hp,damage:d.damage,armor:d.armor,
    range:d.range,rate:d.rate,speed:d.speed,airTarget:d.airTarget,
    kind:d.kind,heal:d.heal,blast:d.blast||0,good:d.good,bad:d.bad});
}
console.log(JSON.stringify(arr));
"""
web = subprocess.run(
    ["node", "-e", node_script],
    cwd=ROOT, check=False, capture_output=True, text=True, timeout=30
)
if web.returncode != 0:
    raise RuntimeError(f"Browser JS extraction exited {web.returncode}:\n{web.stderr}\n{web.stdout}")
native = subprocess.run(
    ["godot", "--headless", "--path", str(ROOT / "desert-front-godot"),
     "--script", "res://tests/stat_dump.gd"],
    cwd=ROOT, check=True, capture_output=True, text=True, timeout=60
)
tag = "DESERT_UNIT_PARITY_JSON="
line = next((x.split(tag,1)[1] for x in native.stdout.splitlines()
             if tag in x), None)
if line is None:
    raise AssertionError("Godot did not export unit definitions:\n"+native.stdout+native.stderr)
web_units = json.loads(web.stdout)
gd_units = json.loads(line)
assert len(web_units) == len(gd_units) == 80, (len(web_units),len(gd_units))
differences = []
for expected, actual in zip(web_units,gd_units):
    for key, target in expected.items():
        present = actual.get(key)
        if isinstance(target, (int,float)) and not isinstance(target,bool):
            equal = isinstance(present,(int,float)) and math.isclose(target,present,rel_tol=1e-5,abs_tol=1e-5)
        else:
            equal = target == present
        if not equal:
            differences.append(f"f{expected['f']} role{expected['r']} {key}: web={target} native={present}")
if differences:
    print("\n".join(differences[:100]))
    raise SystemExit(f"FAILED: {len(differences)} differences in web/native 80-unit definitions")
print("DESERT FRONT EXACT STAT PARITY OK: 80 units x 12 numeric/status/matchup fields")
