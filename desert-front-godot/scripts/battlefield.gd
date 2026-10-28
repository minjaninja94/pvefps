extends Control
## Native Godot 2D renderer for the ORIGINAL Desert Front WebP sprite strips.
## 10 factions × 8 roles × 8 poses, plus readable combat silhouettes/HP.
const Roster = preload("res://scripts/roster.gd")
const Sprites = preload("res://scripts/sprite_assets.gd")
var simulation
var _tick := 0.0
var _anim_seconds := 0.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	custom_minimum_size = Vector2(560, 480)
	resized.connect(queue_redraw)

func _process(delta: float) -> void:
	_anim_seconds += delta
	_tick += delta
	if _tick > 0.04:
		_tick = 0.0
		queue_redraw()

func _draw() -> void:
	var w := size.x
	var h := size.y
	draw_rect(Rect2(Vector2.ZERO, size), Color("#101d27"))
	for i in range(18):
		var x := float(i) * w / 17.0
		draw_line(Vector2(x, 0), Vector2(x, h), Color("#29414a", 0.35), 1.0)
	for i in range(7):
		var y := float(i) * h / 6.0
		draw_line(Vector2(0, y), Vector2(w, y), Color("#29414a", 0.32), 1.0)
	var top_y := h * 0.25
	var middle_y := h * 0.52
	var low_y := h * 0.78
	draw_rect(Rect2(0, top_y - 38, w, low_y - top_y + 76), Color("#23343b", 0.38))
	for y in [top_y, middle_y, low_y]:
		draw_line(Vector2(0, y), Vector2(w, y), Color("#809a96", 0.12), 2.0)
	draw_line(Vector2(w * 0.5, top_y - 60), Vector2(w * 0.5, low_y + 60), Color("#c4c2a0", 0.45), 2.0, true)
	_draw_core(_screen_position(110.0,260.0), Color("#6bdbf4"), 0)
	_draw_core(_screen_position(Roster.WORLD_WIDTH-110.0,260.0), Color("#f4a17e"), 1)
	_draw_tower(_screen_position(215.0,260.0), 0)
	_draw_tower(_screen_position(Roster.WORLD_WIDTH-215.0,260.0), 1)
	if simulation != null:
		for side in range(2):
			if float(simulation.forward_hp[side]) > 0.0:
				var tower_x := 825.0 if side == 0 else Roster.WORLD_WIDTH-825.0
				_draw_forward_tower(_screen_position(tower_x,260.0), side)

	if simulation == null:
		return
	# Sort by vertical position, ensuring rear ranks are not painted over forward units.
	var ordered: Array = simulation.units.duplicate()
	ordered.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["y"]) < float(b["y"]))
	for u in ordered:
		_draw_unit(u)
	for dead in simulation.death_effects:
		_draw_death(dead)

func _screen_position(x: float, y: float) -> Vector2:
	return Vector2(
		24.0 + x / Roster.WORLD_WIDTH * (size.x - 48.0),
		32.0 + y / Roster.WORLD_HEIGHT * (size.y - 64.0)
	)

func _sprite_size(role: int) -> float:
	if role == 3:
		return 62.0
	if role == 6:
		return 55.0
	if role == 5:
		return 53.0
	return 46.0

func _draw_unit(u: Dictionary) -> void:
	var team: int = u["team"]
	var faction: int = u["faction"]
	var role: int = u["role"]
	var pos := _screen_position(float(u["x"]), float(u["y"]))
	var art_size := _sprite_size(role) * (1.75 if int(u.get("hero_count",1)) == 20 else 1.0)
	var tint := Color(Roster.FACTION_COLORS[faction])
	draw_ellipse_shadow(pos, art_size)
	var skin := str(u.get("skin","default"))
	var tex := Sprites.skin_atlas(faction, role, skin)
	if tex:
		var action := str(u.get("action", "move"))
		var phase := _anim_seconds + float(int(u["id"]) % 8) * 0.067
		if float(u.get("action_ttl", 0.0)) > 0:
			phase = _anim_seconds
		var frame: int = Sprites.pose(action, phase)
		_draw_sprite_frame(tex, pos, art_size, frame, team == 1, Color.WHITE, Sprites.frame_region(faction,role,frame,skin))
	else:
		_draw_marker_fallback(pos, art_size, role, tint, team)
	if int(u.get("hero_count",1)) == 20:
		var glow := Color("#5cf1a3") if bool(u.get("guardian",false)) else Color("#ff6173")
		draw_arc(pos+Vector2(0,art_size*0.26),art_size*0.52,0.0,TAU,24,glow,2.3)
	var hp_ratio: float = clampf(float(u["hp"]) / maxf(1.0, float(u["max_hp"])), 0.0, 1.0)
	var hp_width: float = art_size * 0.67
	var hp_y := pos.y - art_size * 0.77
	draw_rect(Rect2(pos.x - hp_width * 0.5, hp_y, hp_width, 3), Color("#18232a"))
	draw_rect(Rect2(pos.x - hp_width * 0.5, hp_y, hp_width * hp_ratio, 3), Color("#9cdeaa") if team == 0 else Color("#f28a83"))
	# A subtle underline identifies team without recoloring the authored pixel art.
	draw_line(pos + Vector2(-10, 13), pos + Vector2(10, 13), Color("#77edee", 0.42) if team == 0 else Color("#f5a58d", 0.52), 1.3)

func draw_ellipse_shadow(pos: Vector2, art_size: float) -> void:
	draw_set_transform(pos + Vector2(0, 8), 0.0, Vector2(1, 0.36))
	draw_circle(Vector2.ZERO, art_size * 0.36, Color(0.0, 0.0, 0.0, 0.28))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_sprite_frame(tex: Texture2D, pos: Vector2, art_size: float, frame: int, enemy: bool, modulate: Color, src: Rect2) -> void:
	# Right-side forces look toward the left; do not mirror the original atlas itself.
	draw_set_transform(pos, 0.0, Vector2(-1, 1) if enemy else Vector2.ONE)
	draw_texture_rect_region(
		tex,
		Rect2(-art_size * 0.5, -art_size * 0.75, art_size, art_size),
		src,
		modulate
	)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_marker_fallback(pos: Vector2, art_size: float, role: int, tint: Color, team: int) -> void:
	var radius := art_size * 0.23
	draw_circle(pos, radius, tint)
	draw_arc(pos, radius, 0.0, TAU, 16, Color("#e5f3e7") if team == 0 else Color("#e4ab99"), 1.4)
	if role == 7:
		draw_line(pos + Vector2(-4, 0), pos + Vector2(4, 0), Color.WHITE, 2)
		draw_line(pos + Vector2(0, -4), pos + Vector2(0, 4), Color.WHITE, 2)

func _draw_death(dead: Dictionary) -> void:
	var pos := _screen_position(float(dead["x"]), float(dead["y"]))
	var f: int = int(dead["faction"])
	var r: int = int(dead["role"])
	var skin := str(dead.get("skin","default"))
	var tex := Sprites.skin_atlas(f,r,skin)
	var duration: float = clampf(float(dead.get("time", 0.0)), 0.0, 0.75)
	if tex:
		_draw_sprite_frame(tex, pos, _sprite_size(r), 7, int(dead["team"]) == 1, Color(1, 1, 1, duration / 0.75), Sprites.frame_region(f,r,7,skin))

func _draw_core(pos: Vector2, tint: Color, side: int) -> void:
	draw_rect(Rect2(pos - Vector2(19, 28), Vector2(38, 56)), tint.darkened(0.65), true)
	draw_rect(Rect2(pos - Vector2(15, 25), Vector2(30, 50)), tint, false, 3.0)
	if simulation != null:
		var value: float = clampf(float(simulation.cores[side]) / Roster.CORE_HP, 0.0, 1.0)
		draw_rect(Rect2(pos.x - 22, pos.y - 40, 44, 5), Color("#252c30"))
		draw_rect(Rect2(pos.x - 22, pos.y - 40, 44 * value, 5), tint)

func _draw_forward_tower(pos: Vector2, side: int) -> void:
	var tint := Color("#6bdbf4") if side == 0 else Color("#f4a17e")
	draw_circle(pos, 10.0, tint.darkened(0.3))
	draw_arc(pos, 14.0, 0.0, TAU, 16, tint, 2.0)
	var hp := clampf(float(simulation.forward_hp[side])/1000.0,0.0,1.0)
	draw_rect(Rect2(pos.x-14,pos.y-22,28,4),Color("#19272d"))
	draw_rect(Rect2(pos.x-14,pos.y-22,28*hp,4),tint)

func _draw_tower(pos: Vector2, side: int) -> void:
	if simulation != null and float(simulation.towers[side]) <= 0.0:
		return
	draw_circle(pos, 12.0, Color("#4d8f9c") if side == 0 else Color("#aa7060"))
	draw_rect(Rect2(pos.x - 3, pos.y - 18, 6, 15), Color("#d1d3b4"))
