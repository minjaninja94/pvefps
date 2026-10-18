# NEON CLASH image assets

Created 2026-10-18 with the built-in image_gen tool (not an external API). Project files preserve alpha, encoded as WebP quality 82 from the generated PNG originals. No runtime AI connection or API key is used.

- `celeste.webp`: silver-blue ice knight, white/cyan armor and energy sword.
- `ruby.webp`: pink-haired adult fox fighter, burgundy/gold armored dress and claw gauntlets.
- `violet.webp`: adult violet-haired astral mage, high-collar robe and purple magic orb.
- `jade.webp`: adult mint-haired cyber cat ninja, teal tactical bodysuit and energy dagger.
- `lineup.webp`: four-character lineup used in the menu background.

Generation prompt set: stylized-concept; one isolated full-body 2D fighting game character per individual sprite, genuine transparent background, mature adult woman age 25+, polished cel-shaded Japanese fantasy fighting-game art, entire figure and equipment in frame with generous alpha margins, three-quarter facing right in a neutral ready stance, no scenery/text/duplicates. Individual descriptions match the filenames above. Lineup requested the same four characters in equal columns on one atlas; use it only as decorative menu art, never crop it for combat.

AI illustration mode uses finished paintings; outfit/hair parts are not separable. Part editing uses the vector renderer. Both modes support name/body size and weapon-specific attack VFX; personal image import uses the same renderer and can be backed up in wardrobe JSON. Images are only sent to a peer when the player joins an online match; personal imported images are limited to 48KB data URLs, keeping appearance packets under the channel cap.
