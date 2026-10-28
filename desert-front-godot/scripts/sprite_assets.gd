extends RefCounted
## Read-only atlas loader for the ORIGINAL 10 faction x 8 role transparent WebP strips.
## Mirrors desert-strike/sprite-atlas.js: 8 poses, each 96x96, all in ONE row.
const FACTIONS := ["forge", "brood", "astral", "marine", "beastkin", "elf", "furry", "robot", "octoper", "fairy"]
const CELL := 96
const POSES := {"idle": [0,1], "move": [2,3], "attack": [4,5], "skill": [4,6], "siege": [4,6], "hit": [5], "spawn": [0], "death": [7]}
static var _atlas_cache: Dictionary = {}
static var _banner_cache: Dictionary = {}
static var _moe_cache: Dictionary = {}
static var _moe_covers: Dictionary = {}
## The original portrait crop coordinates in desert-strike/moe-unit-art.js are 512px-normalized.
const MOE_PORTRAIT_BOUNDS := [[0,235],[0,260],[300,512],[155,400],[42,512],[30,512],[0,285],[0,260],[280,512],[0,280]]

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


## Each moe atlas is 8 columns x 8 rows; rows are the eight unit roles.
static func moe_atlas(faction: int) -> Texture2D:
	if faction < 0 or faction >= FACTIONS.size():
		return null
	var path := "res://assets/sprites/moe-%s-actions.webp" % FACTIONS[faction]
	if not _moe_cache.has(path):
		if not ResourceLoader.exists(path):
			return null
		var tex := load(path) as Texture2D
		if tex == null or tex.get_width() != CELL * 8 or tex.get_height() != CELL * 8:
			push_warning("Invalid original moe actions atlas: " + path)
			return null
		_moe_cache[path] = tex
	return _moe_cache.get(path) as Texture2D

static func skin_atlas(faction: int, role: int, skin: String = "default") -> Texture2D:
	if skin == "moe":
		var moe := moe_atlas(faction)
		if moe != null:
			return moe
	return atlas(faction, role)

static func frame_region(faction: int, role: int, index: int, skin: String = "default") -> Rect2:
	var frame := clampi(index, 0, 7)
	if skin == "moe" and moe_atlas(faction) != null:
		return Rect2(frame * CELL, role * CELL, CELL, CELL)
	return Rect2(frame * CELL, 0, CELL, CELL)

static func skin_portrait(faction: int, role: int, skin: String = "default", index: int = 0) -> AtlasTexture:
	if role < 0 or role >= 8:
		return null
	var tex := skin_atlas(faction, role, skin)
	if tex == null:
		return null
	var result := AtlasTexture.new()
	result.atlas = tex
	result.region = frame_region(faction, role, index, skin)
	return result

static func skin_banner(faction: int, skin: String = "default") -> Texture2D:
	if skin != "moe":
		return banner(faction)
	if faction < 0 or faction >= FACTIONS.size():
		return null
	var path := "res://assets/sprites/moe-%s-portrait.webp" % FACTIONS[faction]
	if not _moe_covers.has(path):
		if not ResourceLoader.exists(path):
			return banner(faction)
		var tex := load(path) as Texture2D
		if tex == null or tex.get_height() == 0:
			return banner(faction)
		var bounds: Array = MOE_PORTRAIT_BOUNDS[faction]
		var h := float(tex.get_height())
		var crop := AtlasTexture.new()
		crop.atlas = tex
		crop.region = Rect2(0, h * float(bounds[0]) / 512.0, tex.get_width(), h * float(bounds[1]-bounds[0]) / 512.0)
		_moe_covers[path] = crop
	return _moe_covers[path] as Texture2D
