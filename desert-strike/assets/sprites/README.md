# Original Desert Front raster sprite atlas

This directory contains the ten image-generated, transparent WebP atlases (all committed to GitHub).

All WebP files are ready for the game to load; the separately provided ZIP is an optional backup.

Extract the ZIP inside `desert-strike/`; it creates:

- `assets/sprites/forge.webp`
- `assets/sprites/brood.webp`
- `assets/sprites/astral.webp`
- `assets/sprites/marine.webp`
- `assets/sprites/beastkin.webp`
- `assets/sprites/elf.webp`
- `assets/sprites/furry.webp`
- `assets/sprites/robot.webp`
- `assets/sprites/octoper.webp`
- `assets/sprites/fairy.webp`
- `assets/sprites/atlas-manifest.json`

Every image is **480×768 px**, split into 8 rows and 5 columns of 96×96.
The four rightmost action columns after idle are move, attack, skill and death.
The original 10 image-generation roster sheets were cropped and made transparent.
`sprite-atlas.js` detects absent images and safely preserves existing graphics.
