extends RefCounted
## 12 custom icons sliced from the new Desert Front concept art, packed 24x24 each.
const ART := preload("res://assets/ui/command_icons_generated.webp")
const TILE := 24
const NAMES := ["barracks","upgrade","magic","guardian","barrage","nuke","repair","settings","messages","members","achievement","shop"]

static func get_icon(index: int) -> Texture2D:
	var i := clampi(index,0,NAMES.size()-1)
	var atlas := AtlasTexture.new()
	atlas.atlas = ART
	atlas.region = Rect2(i*TILE,0,TILE,TILE)
	return atlas

static func named(name: String) -> Texture2D:
	var index := NAMES.find(name)
	return get_icon(index if index >= 0 else 0)
