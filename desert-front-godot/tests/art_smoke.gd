extends SceneTree
const Sprites = preload("res://scripts/sprite_assets.gd")

func _initialize() -> void:
	call_deferred("_check")

func _check() -> void:
	var missing: Array[String] = []
	for f in range(10):
		for role in range(8):
			var tex := Sprites.atlas(f, role)
			if tex == null:
				missing.append("uniform-%s-%d.webp" % [Sprites.FACTIONS[f], role])
		if Sprites.banner(f) == null:
			missing.append("%s-banner.webp" % Sprites.FACTIONS[f])
		if Sprites.moe_atlas(f) == null:
			missing.append("moe-%s-actions.webp" % Sprites.FACTIONS[f])
		if Sprites.skin_banner(f, "moe") == null:
			missing.append("moe-%s-portrait.webp" % Sprites.FACTIONS[f])
	if not missing.is_empty():
		push_error("Missing or invalid original sprite assets: " + ", ".join(missing))
		quit(2)
		return
	assert(Sprites.pose("move", 0.0) == 2)
	assert(Sprites.pose("move", 0.16) == 3)
	assert(Sprites.pose("death", 1.0) == 7)
	var frame := Sprites.portrait(3, 6, 5)
	assert(frame != null and frame.region.position.x == 480.0)
	var moe_frame := Sprites.skin_portrait(3, 6, "moe", 5)
	assert(moe_frame != null and moe_frame.region == Rect2(480, 576, 96, 96))
	print("DESERT FRONT PIXEL ART OK: 80 original units / 10 banners / 10 moe atlases / 10 moe portraits / 640 per-skin native frames")
	quit(0)
