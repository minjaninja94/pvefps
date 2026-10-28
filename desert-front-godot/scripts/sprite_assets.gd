extends RefCounted
## Read-only atlas loader for the ORIGINAL 10 faction x 8 role transparent WebP strips.
## Mirrors desert-strike/sprite-atlas.js: 8 poses, each 96x96, all in ONE row.
const FACTIONS := ["forge", "brood", "astral", "marine", "beastkin", "elf", "furry", "robot", "octoper", "fairy"]
const CELL := 96
const POSES := {"idle": [0,1], "move": [2,3], "attack": [4,5], "skill": [4,6], "siege": [4,6], "hit": [5], "spawn": [0], "death": [7]}
static var _atlas_cache: Dictionary = {}
static var _banner_cache: Dictionary = {}

static func atlas_path(faction: int, role: int) -> String:
	if faction < 0 or faction >= FACTIONS.size() or role < 0 or role >= 8:
		return ""
	return "res://assets/sprites/uniform-%s-%d.webp" % [FACTIONS[faction], role]

static func atlas(faction: int, role: int) -> Texture2D:
	var path := atlas_path(faction, role)
	if path.is_empty():
		return null
	if not _atlas_cache.has(path):
		if not ResourceLoader.exists(path):
			return null
		var tex := load(path) as Texture2D
		if tex == null or tex.get_width() != 8 * CELL or tex.get_height() != CELL:
			push_warning("Invalid Desert Front 8-pose sprite strip: " + path)
			return null
		_atlas_cache[path] = tex
	return _atlas_cache.get(path) as Texture2D

static func banner(faction: int) -> Texture2D:
	if faction < 0 or faction >= FACTIONS.size():
		return null
	var path := "res://assets/sprites/%s-banner.webp" % FACTIONS[faction]
	if not _banner_cache.has(path):
		if not ResourceLoader.exists(path):
			return null
		_banner_cache[path] = load(path)
	return _banner_cache.get(path) as Texture2D

static func pose(action: String, animation_seconds: float) -> int:
	var frames: Array = POSES.get(action, POSES["idle"])
	if frames.size() == 1:
		return int(frames[0])
	if action in ["attack", "skill", "siege"]:
		return int(frames[1]) if fmod(animation_seconds, 0.5) > 0.22 else int(frames[0])
	return int(frames[int(floor(animation_seconds * 7.0)) % frames.size()])

static func portrait(faction: int, role: int, pose_index: int = 0) -> AtlasTexture:
	var tex := atlas(faction, role)
	if tex == null:
		return null
	var a := AtlasTexture.new()
	a.atlas = tex
	a.region = Rect2(clampi(pose_index, 0, 7) * CELL, 0, CELL, CELL)
	return a
