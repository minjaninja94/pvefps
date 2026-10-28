extends Control
## Three continuous, cross-lane battle bands. Uses original Godot-imported WebP unit sprites.
const Sprites = preload("res://scripts/sprite_assets.gd")
const Roster = preload("res://scripts/roster.gd")
const WORLD_WIDTH := 3300.0
const LANE_HEIGHT := 520.0
var simulation
var selected_lane := 1
var _time := 0.0
var _tick := 0.0
signal lane_clicked(lane: int)

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(500,360)
	resized.connect(queue_redraw)

func _process(dt: float) -> void:
	_time += dt
	_tick += dt
	if _tick >= 0.05:
		_tick = 0.0
		queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var lanes: int = simulation.lanes if simulation != null else 3
		selected_lane = clampi(int(event.position.y/maxf(1.0,size.y)*lanes),0,lanes-1)
		lane_clicked.emit(selected_lane)
		queue_redraw()

func _p(x: float, y: float) -> Vector2:
	var height: float = simulation.lanes * LANE_HEIGHT if simulation != null else 1560.0
	return Vector2(16.0 + x / WORLD_WIDTH * (size.x - 32.0),14.0 + y / height * (size.y - 28.0))

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,size),Color("#081922"))
	if simulation == null:
		return
	for lane in range(simulation.lanes):
		var row_height: float = (size.y-28.0)/float(simulation.lanes)
		var y: float = 14.0+lane*row_height
		draw_rect(Rect2(0,y,size.x,row_height),Color("#27434b",0.34 if lane == selected_lane else 0.17))
		if lane == selected_lane:
			draw_rect(Rect2(1,y+1,size.x-2,row_height-2),Color("#8ae9d1",0.82),false,2.0)
		draw_line(Vector2(0,y),Vector2(size.x,y),Color("#9fbdb0",0.25),1.0)
		for x in range(0,3301,330):
			var p := _p(x,lane*LANE_HEIGHT+20.0)
			draw_line(Vector2(p.x,y+2),Vector2(p.x,y+row_height-2),Color("#8db4b2",0.1))
		for team in range(2):
			var y_mid := (lane+0.5)*LANE_HEIGHT
			_draw_defense(lane,team,y_mid)
		var front_y: float = y+row_height*0.5
		draw_line(Vector2(size.x*0.5,y+3),Vector2(size.x*0.5,y+row_height-3),Color("#a8d6b2",0.26),1.0,true)
		draw_line(Vector2(0,front_y),Vector2(size.x,front_y),Color("#91c2bd",0.12),1.0)
	var ordered: Array = simulation.units.duplicate()
	ordered.sort_custom(func(a: Dictionary,b: Dictionary) -> bool: return float(a["y"])<float(b["y"]))
	for u in ordered:
		_draw_unit(u)
	for fx in simulation.effects:
		_draw_effect(fx)
	if simulation.ended:
		draw_rect(Rect2(0,0,size.x,size.y),Color("#07131c",0.6))
		var font: Font = ThemeDB.fallback_font
		var text := "경기 종료 · 승리팀 %d" % simulation.winner if simulation.winner >= 0 else "무승부"
		draw_string(font,Vector2(size.x*0.5-90,size.y*0.5),text,HORIZONTAL_ALIGNMENT_LEFT,-1,23,Color("#e8ffdf"))

func _draw_defense(lane: int,team: int,y: float) -> void:
	var tint := Color("#6bd3d6") if team == 0 else Color("#e59c84")
	var core_pos := _p(110.0 if team == 0 else 3190.0,y)
	var tower_pos := _p(215.0 if team == 0 else 3085.0,y)
	var forward_pos := _p(825.0 if team == 0 else 2475.0,y)
	_draw_tower(core_pos,tint,18.0,float(simulation.cores[lane][team]),7200.0 if simulation.lanes == 1 else 2500.0)
	if float(simulation.turrets[lane][team]) > 0.0:
		_draw_tower(tower_pos,tint,12.0,float(simulation.turrets[lane][team]),1250.0)
	if float(simulation.forward_hp[lane][team]) > 0.0:
		_draw_tower(forward_pos,tint,10.0,float(simulation.forward_hp[lane][team]),1000.0)

func _draw_tower(pos: Vector2,tint: Color,r: float,hp: float,max_hp: float) -> void:
	draw_circle(pos+Vector2(2,4),r,Color(0,0,0,0.33))
	draw_circle(pos,r,tint.darkened(0.45))
	draw_arc(pos,r,0,TAU,12,tint,2)
	draw_rect(Rect2(pos.x-r,pos.y-r-8,r*2.0,3),Color("#1b2730"))
	draw_rect(Rect2(pos.x-r,pos.y-r-8,r*2.0*clampf(hp/max_hp,0,1),3),tint)

func _draw_unit(u: Dictionary) -> void:
	if float(u["hp"])<=0:
		return
	var role: int = u["role"]
	var faction: int = u["faction"]
	var team: int = u["team"]
	var is_hero := int(u.get("hero_count",1)) == 20
	var guardian := bool(u.get("guardian",false))
	var pos := _p(float(u["x"]),float(u["y"]))
	var scale := (1.55 if role == 3 else 1.0) * (1.95 if is_hero else 1.0)
	var sprite_size := clampf(size.y/float(simulation.lanes)*0.31*scale,21.0,78.0)
	var src := Sprites.atlas(faction,role)
	draw_set_transform(pos+Vector2(0,sprite_size*0.25),0,Vector2(1.0,0.35))
	draw_circle(Vector2.ZERO,sprite_size*0.35,Color(0,0,0,0.28))
	draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
	if src != null:
		var phase := _time + (int(u["id"])%7)*0.10
		var action: String = str(u.get("action","move"))
		if float(u.get("action_ttl",0.0)) <= 0.0 and action in ["attack","skill","hit","spawn"]:
			action = "idle"
		var index := Sprites.pose(action,phase)
		draw_set_transform(pos,0,Vector2(-1,1) if team==1 else Vector2.ONE)
		draw_texture_rect_region(src,Rect2(-sprite_size*.5,-sprite_size*.72,sprite_size,sprite_size),Rect2(index*96,0,96,96),Color.WHITE)
		draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
	else:
		draw_circle(pos,sprite_size*0.24,Color(Roster.FACTION_COLORS[faction]))
	if is_hero:
		var aura_color := Color("#5cf1a3") if guardian else Color("#ff5364")
		draw_arc(pos+Vector2(0,sprite_size*0.27),sprite_size*0.5,0,TAU,24,aura_color,2.0)
	var hp_y := pos.y-sprite_size*0.78
	draw_rect(Rect2(pos.x-sprite_size*.42,hp_y,sprite_size*.84,3),Color("#16262d"))
	draw_rect(Rect2(pos.x-sprite_size*.42,hp_y,sprite_size*.84*clampf(float(u["hp"])/maxf(1.0,float(u["max_hp"])),0,1),3),Color("#7cead1") if team==0 else Color("#f29a87"))

func _draw_effect(effect: Dictionary) -> void:
	var pos := _p(float(effect["x"]),float(effect["y"]))
	var kind: String = effect["kind"]
	var fraction := clampf(float(effect["time"])/maxf(0.01,float(effect.get("max_time",1.0))),0,1)
	if kind == "death" and int(effect["faction"]) >= 0:
		var tex := Sprites.atlas(int(effect["faction"]),int(effect["role"]))
		if tex != null:
			var sprite_size := clampf(size.y/float(simulation.lanes)*0.34,20.0,54.0)
			draw_texture_rect_region(tex,Rect2(pos.x-sprite_size*.5,pos.y-sprite_size*.6,sprite_size,sprite_size),Rect2(672,0,96,96),Color(1,1,1,fraction))
		return
	var color := Color("#9cfac7") if kind in ["repair","pollen","guardian"] else Color("#ffbb71")
	if kind == "nuke":
		color = Color("#f7e1a9")
	if kind == "hero":
		color = Color("#ff566e")
	draw_arc(pos,13.0 + (1.0-fraction)*24.0,0,TAU,22,Color(color.r,color.g,color.b,fraction*0.8),2.5)
