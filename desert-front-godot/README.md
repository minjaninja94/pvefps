# Desert Front: Native Godot 4 PC Port

**Status: partial gameplay port with the ORIGINAL pixel sprites applied.**

The web game stays intact in desert-strike/. This new Godot project is isolated to desert-front-godot/.

## Original graphics

From the repository root run:

    python3 desert-front-godot/tools/sync_web_art.py

Then open desert-front-godot/project.godot in Godot 4.3+ and press F5.

The sync copies exactly 80 transparent 8-pose 96px WebP uniform character strips and 10 original faction banners from the existing desert-strike/assets/sprites folder into the Godot asset directory, without modifying original files. The Godot render maps pose indices 0-7 to idle/move/attack/skill/death and mirrors opposing units. It also displays faction banner and selected unit portrait in the sidebar.

GitHub Actions runs sprite sync and a dedicated Godot asset test before Windows packaging. Generated Godot art copies are ignored by Git; the canonical art remains in the existing web folder.

## Windows distribution

Download DesertFront-Preview-Windows.zip from the public Releases section and extract all files. The build includes the imported sprites, PCK, third-party NodeTunnel DLL, and relay configuration.

## Remaining limitations

The gameplay is still a limited prototype: unique race passives, precise web balance, hero/guardian mechanics, 3-line competitive/co-op, and full web UI are NOT yet ported. A successful art test is not proof of game rule parity. Relay multiplayer between two remote networks also needs human validation.
