#!/usr/bin/env python3
"""Finish an exported Windows payload before it is embedded in the launcher."""
import os
import shutil
from pathlib import Path

project = Path(__file__).resolve().parents[1]
build = project / "build"
plugin = project / "addons/nodetunnel"
app = os.environ.get("NODETUNNEL_APP_ID", "").strip()
if len(app) < 8:
    raise SystemExit("NODETUNNEL_APP_ID is missing")
relay = build / "online_relay.cfg"
relay.write_text('[relay]\napp_id="' + app + '"\naddress="us-east.nodetunnel.io:8080"\n', encoding="utf-8")
dll = build / "addons/nodetunnel/bin/nodetunnel.dll"
dll.parent.mkdir(parents=True, exist_ok=True)
if not dll.exists():
    source = plugin / "bin/nodetunnel.dll"
    if not source.exists():
        source = build / "nodetunnel.dll"
    shutil.copy2(source, dll)
license = build / "THIRD_PARTY_LICENSES/NodeTunnel_LICENSE.txt"
license.parent.mkdir(parents=True, exist_ok=True)
if not license.exists():
    shutil.copy2(plugin / "LICENSE", license)
print("Prepared Windows payload")
