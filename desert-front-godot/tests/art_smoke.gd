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
	if not missing.is_empty():
		push_error("Missing or invalid original sprite assets: " + ", ".join(missing))
		quit(2)
		return
	assert(Sprites.pose("move", 0.0) == 2)
	assert(Sprites.pose("move", 0.16) == 3)
	assert(Sprites.pose("death", 1.0) == 7)
	var frame := Sprites.portrait(3, 6, 5)
	assert(frame != null and frame.region.position.x == 480.0)
	print("DESERT FRONT PIXEL ART OK: 80 original units / 10 faction banners / native atlas frames")
	quit(0)
