extends Control
## Pure Godot 2D renderer. Temporary vector combat markers until atlas frames are migrated.
const Roster = preload("res://scripts/roster.gd")
var simulation
var _t := 0.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(560, 480)
	resized.connect(queue_redraw)

func _process(delta: float) -> void:
	_t += delta
	if _t > 0.04:
		_t = 0.0
		queue_redraw()

func _draw() -> void:
	var width := size.x
	var height := size.y
	draw_rect(Rect2(Vector2.ZERO, size), Color("#101d27"))
	for i in range(18):
		var x := float(i) * width / 17.0
		draw_line(Vector2(x, 0), Vector2(x, height), Color("#29414a", 0.35), 1.0)
	for i in range(7):
		var y := float(i) * height / 6.0
		draw_line(Vector2(0, y), Vector2(width, y), Color("#29414a", 0.32), 1.0)
	var top_y := height * 0.25
	var middle_y := height * 0.52
	var low_y := height * 0.78
	draw_rect(Rect2(0, top_y - 38, width, low_y - top_y + 76), Color("#23343b", 0.38))
	for y in [top_y, middle_y, low_y]:
		draw_line(Vector2(0, y), Vector2(width, y), Color("#809a96", 0.12), 2.0)
	draw_line(Vector2(width * 0.5, top_y - 60), Vector2(width * 0.5, low_y + 60), Color("#c4c2a0", 0.45), 2.0, true)
	var l_x := 32.0
	var r_x := width - 32.0
	_draw_core(Vector2(l_x, middle_y), Color("#6bdbf4"), 0)
	_draw_core(Vector2(r_x, middle_y), Color("#f4a17e"), 1)
	_draw_tower(Vector2(l_x + 29, top_y), 0)
	_draw_tower(Vector2(r_x - 29, low_y), 1)
	if simulation == null:
		return
	for u in simulation.units:
		var pos := Vector2(
			24.0 + float(u["x"]) / Roster.WORLD_WIDTH * (width - 48.0),
			32.0 + float(u["y"]) / Roster.WORLD_HEIGHT * (height - 64.0)
		)
		var team: int = u["team"]
		var faction: int = u["faction"]
		var role: int = u["role"]
		var tint := Color(Roster.FACTION_COLORS[faction])
		if team == 1:
			tint = tint.lerp(Color("#ff785b"), 0.5)
		var radius := 7.0 if role != 3 else 10.0
		if role == 6:
			radius = 9.0
		draw_circle(pos + Vector2(0, 8), radius * 1.1, Color(0, 0, 0, 0.32))
		draw_circle(pos, radius, tint)
		draw_arc(pos, radius, 0.0, TAU, 12, Color("#e5f3e7") if team == 0 else Color("#e4ab99"), 1.4)
		if role == 7:
			draw_line(pos + Vector2(-3, 0), pos + Vector2(3, 0), Color.WHITE, 2.0)
			draw_line(pos + Vector2(0, -3), pos + Vector2(0, 3), Color.WHITE, 2.0)
		var hp_ratio: float = clampf(float(u["hp"]) / maxf(1.0, float(u["max_hp"])), 0.0, 1.0)
		draw_rect(Rect2(pos.x - radius, pos.y - radius - 7, radius * 2, 2), Color("#2c1d23"))
		draw_rect(Rect2(pos.x - radius, pos.y - radius - 7, radius * 2 * hp_ratio, 2), Color("#a6df8c"))

func _draw_core(pos: Vector2, tint: Color, side: int) -> void:
	draw_rect(Rect2(pos - Vector2(19, 28), Vector2(38, 56)), tint.darkened(0.65), true)
	draw_rect(Rect2(pos - Vector2(15, 25), Vector2(30, 50)), tint, false, 3.0)
	if simulation != null:
		var value: float = clampf(float(simulation.cores[side]) / Roster.CORE_HP, 0, 1)
		draw_rect(Rect2(pos.x - 22, pos.y - 40, 44, 5), Color("#252c30"))
		draw_rect(Rect2(pos.x - 22, pos.y - 40, 44 * value, 5), tint)

func _draw_tower(pos: Vector2, side: int) -> void:
	if simulation != null and float(simulation.towers[side]) <= 0.0:
		return
	draw_circle(pos, 12.0, Color("#4d8f9c") if side == 0 else Color("#aa7060"))
	draw_rect(Rect2(pos.x - 3, pos.y - 18, 6, 15), Color("#d1d3b4"))
