extends RefCounted
## Legacy classic UI facade. The SAME authoritative battle rules now drive classic and 3-lane.
const Roster = preload("res://scripts/roster.gd")
const Match = preload("res://scripts/tri_match.gd")
const SLOTS := 75
const STEP := 0.05
var engine
var seconds := 0.0
var wave := 0
var cash := [360.0,360.0]
var cores := [7200.0,7200.0]
var towers := [1700.0,1700.0]
var forward_hp := [1000.0,1000.0]
var eco := [0,0]
var weapons := [0,0]
var armor_levels := [0,0]
var builds := [[],[]]
var units: Array[Dictionary] = []
var death_effects: Array[Dictionary] = []
var player_faction := 0
var enemy_faction := 1
var player_skin := "default"
var enemy_skin := "default"
var ended := false
var winner := -1
var message := "전투 준비 완료"
var versus_player := false
var difficulty := "normal"

func _init(faction: int = 0, rival: int = 1, first_skin: String = "default", second_skin: String = "default") -> void:
	player_faction = clampi(faction,0,9)
	enemy_faction = clampi(rival,0,9)
	player_skin = first_skin if first_skin in ["default","moe"] else "default"
	enemy_skin = second_skin if second_skin in ["default","moe"] else "default"
	engine = Match.new("classic",1,[
		{"uid":"classic-home","name":"지휘관","team":0,"faction":player_faction,"skin":player_skin},
		{"uid":"classic-away","name":"상대","team":1,"faction":enemy_faction,"skin":enemy_skin,"bot":true}
	])
	engine._ai_buy(engine.players[1])
	_sync()

func _owner(team: int) -> Dictionary:
	return engine.players[team] if team in [0,1] and engine.players.size() == 2 else {}

func _sync() -> void:
	if engine == null or engine.players.size() != 2:
		return
	seconds = engine.seconds
	wave = engine.wave
	ended = engine.ended
	winner = engine.winner
	cash = [float(engine.players[0]["cash"]),float(engine.players[1]["cash"])]
	cores = engine.cores[0].duplicate()
	towers = engine.turrets[0].duplicate()
	forward_hp = engine.forward_hp[0].duplicate()
	eco = [int(engine.players[0]["eco"]),int(engine.players[1]["eco"])]
	weapons = [int(engine.players[0]["weapon"]),int(engine.players[1]["weapon"])]
	armor_levels = [int(engine.players[0]["armor"]),int(engine.players[1]["armor"])]
	builds = [engine.players[0]["buildings"][0].duplicate(),engine.players[1]["buildings"][0].duplicate()]
	units.clear()
	for item in engine.units:
		units.append(item)
	death_effects.clear()
	for effect in engine.effects:
		if str(effect["kind"]) == "death":
			death_effects.append({
				"faction":effect["faction"],"role":effect["role"],
				"team":effect["team"],"skin":effect.get("skin","default"),
				"x":effect["x"],"y":effect["y"],"time":effect["time"]
			})

func purchase(slot: int, role: int) -> bool:
	return purchase_for_team(0,slot,role)

func purchase_for_team(team: int, slot: int, role: int) -> bool:
	if engine == null or ended or team not in [0,1]:
		return false
	var result: Dictionary = engine._build(_owner(team),0,slot,role)
	message = "건설 완료" if bool(result.get("ok",false)) else str(result.get("reason","건설 실패"))
	_sync()
	return bool(result.get("ok",false))

func cost_for(team: int, role: int) -> int:
	if role == 8:
		return engine.eco_price(int(engine.players[clampi(team,0,1)]["eco"]))
	return int(Roster.COST[clampi(role,0,7)])

func upgrade(kind: String) -> bool:
	return upgrade_for_team(0,kind)

func upgrade_for_team(team: int, kind: String) -> bool:
	if engine == null or ended or team not in [0,1]:
		return false
	var result: Dictionary = engine._upgrade(_owner(team),kind)
	message = "강화 완료" if bool(result.get("ok",false)) else str(result.get("reason","강화 실패"))
	_sync()
	return bool(result.get("ok",false))

func tactic(kind: String) -> bool:
	return tactic_for_team(0,kind)

func tactic_for_team(team: int, kind: String) -> bool:
	if engine == null or ended or team not in [0,1]:
		return false
	var result: Dictionary = engine._tactic(_owner(team),kind,0)
	message = "전술 사용" if bool(result.get("ok",false)) else str(result.get("reason","전술 실패"))
	_sync()
	return bool(result.get("ok",false))

func _spawn(team: int, slot: int, role: int) -> void:
	if team in [0,1]:
		engine._spawn(_owner(team),0,slot,role)
		_sync()

func advance(dt: float) -> void:
	if engine == null or ended:
		return
	engine.players[1]["bot"] = not versus_player
	engine.difficulty = difficulty if difficulty in ["normal","hard"] else "normal"
	engine.advance(dt)
	_sync()

func snapshot() -> Dictionary:
	return {"engine":engine.snapshot(),"wave":wave,"units":units.duplicate(true),"versus_player":versus_player,
		"difficulty":difficulty,"message":message,"faction0":player_faction,
		"faction1":enemy_faction,"skin0":player_skin,"skin1":enemy_skin}

func load_snapshot(data: Dictionary) -> void:
	if not data.has("engine") or not data["engine"] is Dictionary:
		return
	engine.load_snapshot(data["engine"])
	message = str(data.get("message",message))
	versus_player = bool(data.get("versus_player",versus_player))
	difficulty = str(data.get("difficulty",difficulty))
	player_faction = clampi(int(data.get("faction0",player_faction)),0,9)
	enemy_faction = clampi(int(data.get("faction1",enemy_faction)),0,9)
	player_skin = str(data.get("skin0",player_skin))
	enemy_skin = str(data.get("skin1",enemy_skin))
	_sync()

func seconds_to_next_wave() -> int:
	return maxi(0,ceili(engine.next_wave))
