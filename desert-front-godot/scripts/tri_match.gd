extends RefCounted
## Native 1-lane classic / 3-lane PvP or co-op authoritative Desert Front match.
## Port of the web tri-lane kernel. No browser JavaScript is executed by this game.
const Roster = preload("res://scripts/roster.gd")
const WIDTH := 3300.0
const LANE_HEIGHT := 520.0
const SLOTS := 75
const WAVE_SECONDS := 24.0
const CORE_CLASSIC := 7200.0
const CORE_TRI := 2500.0
const TOWER_HP := 1250.0
const TOWER_CLASSIC_HP := 1700.0
const FORWARD_HP := 1000.0
const GUARDIAN_REWARD := 150
const MAX_UNIT_POP := 75
const MAX_GLOBAL_UNITS := 520 # Supports 6 team-lane caps (6 x 75) plus hero/guardian overhead
const GOODS := [[5,7],[0,7],[3,4],[1,4],[6],[1,4],[0,3],[3,1]]
const BADS := [[3,1],[3,5],[0,1],[2,6],[3,2],[0,6],[4,1],[0,5]]
const AI_PLANS := [
	{"opening": [3,1], "weights": [2,3,2,5,1,2,1,2]},
	{"opening": [6,1], "weights": [1,3,2,2,1,2,5,2]},
	{"opening": [0,1,0], "weights": [5,4,2,2,1,2,2,1]},
	{"opening": [3,2], "weights": [1,3,3,4,1,5,1,2]}
]
var mode := "classic"
var size := 1
var lanes := 1
var difficulty := "normal"
var seconds := 0.0
var wave := 0
var next_wave := 24.0
var ended := false
var winner := -1
var players: Array[Dictionary] = []
var units: Array[Dictionary] = []
var effects: Array[Dictionary] = []
var cores := []
var turrets := []
var forward_hp := []
var forward_claimed := []
var turret_cool := []
var forward_cool := []
var lane_pressure := []
var next_unit_id := 1
var _econ_timer := 0.0
var _ai_timer := 0.0
var _consolidate_timer := 0.0
var _marine_jobs: Array[Dictionary] = []
var _brood_total: Dictionary = {}
var _brood_per_wave: Dictionary = {}
var _recruits_per_wave: Dictionary = {}

func _init(match_mode: String = "classic", match_size: int = 1, members: Array = [], ai: String = "normal") -> void:
	if match_mode not in ["classic", "pvp", "coop"]:
		push_error("Unsupported Desert Front match mode")
		match_mode = "classic"
	mode = match_mode
	size = 1 if mode == "classic" else clampi(match_size, 1, 3)
	if mode == "coop":
		size = clampi(match_size, 2, 3)
	lanes = 1 if mode == "classic" else 3
	difficulty = "hard" if ai == "hard" else "normal"
	for _i in range(lanes):
		cores.append([CORE_CLASSIC, CORE_CLASSIC] if lanes == 1 else [CORE_TRI, CORE_TRI])
		turrets.append([TOWER_CLASSIC_HP,TOWER_CLASSIC_HP] if lanes == 1 else [TOWER_HP,TOWER_HP])
		forward_hp.append([FORWARD_HP, FORWARD_HP])
		forward_claimed.append([false, false])
		turret_cool.append([0.0, 0.0])
		forward_cool.append([0.0, 0.0])
		lane_pressure.append(0.5)
	var prepared: Array = members.duplicate(true)
	if prepared.is_empty():
		prepared = [
			{"uid":"local","name":"지휘관","team":0,"faction":0},
			{"uid":"enemy","name":"적 AI","team":1,"faction":1,"bot":true}
		]
	for raw in prepared:
		if not raw is Dictionary:
			continue
		var p: Dictionary = raw.duplicate(true)
		var building_rows: Array = []
		for _lane in range(lanes):
			var row: Array = []
			row.resize(SLOTS)
			row.fill(-1)
			building_rows.append(row)
		p["uid"] = str(p.get("uid","")).left(40)
		p["name"] = str(p.get("name","지휘관")).left(16)
		p["team"] = clampi(int(p.get("team",0)),0,1)
		p["faction"] = clampi(int(p.get("faction",0)),0,9)
		p["skin"] = str(p.get("skin","default")) if str(p.get("skin","default")) in ["default","moe","twilight","aurora","gold"] else "default"
		p["bot"] = bool(p.get("bot",false))
		p["cash"] = 360.0
		p["eco"] = 0
		p["eco_ready_at"] = 0.0
		p["weapon"] = 0
		p["armor"] = 0
		p["nukes"] = 1
		p["barrage_cd"] = 0.0
		p["mine_costs"] = {}
		p["buildings"] = building_rows
		p["ai_plan"] = (players.size() + int(p["faction"])) % AI_PLANS.size()
		p["ai_opening"] = 0
		p["ai_target_role"] = -1
		p["ai_last_threat"] = ""
		players.append(p)
	if mode == "coop":
		for i in range(size):
			var faction: int = (i + 3) % 10
			var buildings: Array = []
			for _l in range(lanes):
				var slots: Array = []
				slots.resize(SLOTS)
				slots.fill(-1)
				buildings.append(slots)
			players.append({
				"uid":"AI_%d" % i, "name":"적 AI %d" % (i + 1), "team":1,
				"faction":faction, "skin":"default", "bot":true, "cash":360.0, "eco":0,
				"eco_ready_at":0.0, "weapon":0, "armor":0, "nukes":1,
				"barrage_cd":0.0, "mine_costs":{}, "buildings":buildings,
				"ai_plan":i % 4, "ai_opening":0, "ai_target_role":-1, "ai_last_threat":""
			})

func player_for(uid: String) -> Dictionary:
	for p in players:
		if str(p["uid"]) == uid:
			return p
	return {}

func eco_price(level: int) -> int:
	return roundi(70.0 * pow(1.36, level))

func eco_stabilize(level: int) -> float:
	return 4.0 + 2.0 * level + minf(6.0, floorf(seconds / 120.0))

func order(uid: String, data: Dictionary) -> Dictionary:
	var p := player_for(uid)
	if p.is_empty() or bool(p["bot"]) or ended:
		return {"ok":false,"reason":"조작 권한이 없습니다."}
	var command := str(data.get("type",""))
	if command == "build":
		return _build(p, int(data.get("lane",-1)),int(data.get("slot",-1)),int(data.get("role",-2)))
	if command == "upgrade":
		return _upgrade(p,str(data.get("kind","")))
	if command == "tactic":
		return _tactic(p,str(data.get("kind","")),int(data.get("lane",-1)))
	return {"ok":false,"reason":"지원하지 않는 명령입니다."}

func _build(p: Dictionary, lane: int, slot: int, role: int) -> Dictionary:
	if lane < 0 or lane >= lanes or slot < 0 or slot >= SLOTS or role < -1 or role > 8:
		return {"ok":false,"reason":"건설 위치 또는 병종 오류"}
	var old: int = p["buildings"][lane][slot]
	if old == role or old >= 0 and role >= 0:
		return {"ok":false,"reason":"이미 건물이 있습니다. 교체하려면 철거하세요."}
	if role == 8 and (int(p["eco"]) >= 7 or seconds < float(p["eco_ready_at"])):
		return {"ok":false,"reason":"채굴망 최대치 또는 안정화 중"}
	var key := "%d-%d" % [lane,slot]
	var refund := 0
	if old >= 0:
		refund = floori(float(p["mine_costs"].get(key,0)) * 0.55) if old == 8 else floori(float(Roster.COST[old]) * 0.55)
	var cost := (eco_price(int(p["eco"])) if role == 8 else (int(Roster.COST[role]) if role >= 0 else 0))
	var payment := cost - refund
	if float(p["cash"]) < payment:
		return {"ok":false,"reason":"크레딧 부족"}
	p["cash"] = float(p["cash"]) - payment
	p["buildings"][lane][slot] = role
	if old == 8:
		p["eco"] = int(p["eco"]) - 1
		p["mine_costs"].erase(key)
	if role == 8:
		p["mine_costs"][key] = cost
		p["eco"] = int(p["eco"]) + 1
		p["eco_ready_at"] = seconds + eco_stabilize(int(p["eco"]))
	return {"ok":true,"cash":p["cash"]}

func _upgrade(p: Dictionary, kind: String) -> Dictionary:
	if kind not in ["weapon","armor"]:
		return {"ok":false,"reason":"강화 종류 오류"}
	var level: int = p[kind]
	if level >= 5:
		return {"ok":false,"reason":"최대 강화 완료"}
	var cost := roundi((200.0 if kind == "weapon" else 190.0) * pow(1.65 if kind == "weapon" else 1.63,level))
	if float(p["cash"]) < cost:
		return {"ok":false,"reason":"강화 비용 부족"}
	p["cash"] = float(p["cash"]) - cost
	p[kind] = level + 1
	if kind == "armor":
		for u in units:
			if str(u["uid"]) != str(p["uid"]) or bool(u.get("hatchling",false)):
				continue
			var additional: float = float(u["max_hp"]) * 0.09 / (1.0 + 0.09 * level)
			u["max_hp"] += additional
			u["hp"] += additional
	return {"ok":true,"level":p[kind],"cash":p["cash"]}

func _tactic(p: Dictionary, kind: String, lane: int) -> Dictionary:
	var team: int = p["team"]
	if kind == "repair":
		if lane < 0 or lane >= lanes or float(turrets[lane][team]) >= (TOWER_CLASSIC_HP if lanes == 1 else TOWER_HP) or float(p["cash"]) < 180.0:
			return {"ok":false,"reason":"수리 불가 / 180 CR 필요"}
		p["cash"] -= 180.0
		turrets[lane][team] = minf(TOWER_CLASSIC_HP if lanes == 1 else TOWER_HP,float(turrets[lane][team]) + 310.0)
		_effect("repair",215.0 if team == 0 else WIDTH-215.0,(lane + 0.5) * LANE_HEIGHT,team,0.9)
		return {"ok":true}
	if kind == "nuke":
		if int(p["nukes"]) < 1:
			return {"ok":false,"reason":"핵탄두 소진"}
		var endangered := false
		for row in cores:
			if float(row[team]) <= (CORE_CLASSIC if lanes == 1 else CORE_TRI) * 0.7:
				endangered = true
		var target_count := 0
		for u in units:
			if int(u["team"]) != team and (float(u["x"]) <= 550.0 if team == 0 else float(u["x"]) >= WIDTH - 550.0):
				target_count += 1
				if float(u["x"]) <= 370.0 if team == 0 else float(u["x"]) >= WIDTH - 370.0:
					endangered = true
		if not endangered or target_count == 0:
			return {"ok":false,"reason":"기지 위기 시 침공군에만 핵 사용 가능"}
		p["nukes"] = 0
		for u in units:
			if int(u["team"]) != team and (float(u["x"]) <= 550.0 if team == 0 else float(u["x"]) >= WIDTH - 550.0):
				u["hp"] = 0.0
				_effect("nuke",u["x"],u["y"],team,0.9)
		_remove_dead()
		return {"ok":true}
	if kind == "barrage":
		if float(p["cash"]) < 260.0 or float(p["barrage_cd"]) > 0.0:
			return {"ok":false,"reason":"폭격 비용 260 CR / 재충전 중"}
		var target: Dictionary = {}
		var score := -1.0
		for unit in units:
			if int(unit["team"]) == team or not _scouted(unit,team):
				continue
			var density := 0.0
			for other in units:
				if int(other["team"]) != team and _distance(unit,other) < 110.0:
					density += int(Roster.COST[int(other["role"])]) * (20 if int(other.get("hero_count",1)) == 20 else 1)
			if density > score:
				score = density
				target = unit
		if target.is_empty():
			return {"ok":false,"reason":"정찰된 적 없음"}
		p["cash"] -= 260.0
		p["barrage_cd"] = 32.0
		for u in units:
			if int(u["team"]) != team:
				var dist := _distance(u,target)
				if dist < 118.0:
					_damage(u,260.0*(1.0-0.45*dist/118.0),null)
		_effect("barrage",target["x"],target["y"],team,0.9)
		_remove_dead()
		return {"ok":true}
	return {"ok":false,"reason":"지원하지 않는 전술"}

func _scouted(unit: Dictionary, team: int) -> bool:
	if wave >= 6:
		return true
	var x: float = unit["x"]
	if team == 0 and x < WIDTH - 770.0 or team == 1 and x > 770.0:
		return true
	for scout in units:
		if int(scout["team"]) == team and int(scout["lane"]) == int(unit["lane"]) and _distance(scout,unit) < 340.0:
			return true
	return false

func _spawn(p: Dictionary, lane: int, slot: int, role: int, guardian_spawn: bool = false) -> bool:
	if units.size() >= MAX_GLOBAL_UNITS and not guardian_spawn:
		return false
	var f: int = p["faction"]
	var team: int = p["team"]
	var stats: Dictionary = Roster.definition(f,role)
	var hp: float = float(stats["hp"]) * (1.0 + 0.09 * int(p["armor"]))
	var x: float = (235.0 + (slot % 15) * 4.0) if team == 0 else (WIDTH - 235.0 - (slot % 15) * 4.0)
	var y: float = lane * LANE_HEIGHT + 265.0 + float((int(slot / 15) * 11 + (slot % 15) * 21) % 196) - 98.0
	var u := {
		"id":next_unit_id, "uid":p["uid"], "team":team,
		"faction":f, "role":role, "skin":p.get("skin","default"), "lane":lane, "x":x,"y":y,
		"hp":hp, "max_hp":hp, "cool":0.1,
		"stats":stats, "action":"spawn","action_ttl":0.35,
		"ink_until":0.0, "last_ink":-999.0,"last_ward":-999.0,
		"last_brood":-999.0, "last_damage":-999.0,
		"last_pollen":-999.0, "hero_count":1,
		"guardian":false, "hatchling":false, "conscripted":false,
		"radius":23.0 if role == 3 else (28.0 if role == 6 and f in [3,7] else 15.0)
	}
	units.append(u)
	next_unit_id += 1
	return true

func spawn_guardian(team: int, lane: int) -> void:
	var defenders: Array[Dictionary] = []
	for p in players:
		if int(p["team"]) == team:
			defenders.append(p)
	if defenders.is_empty():
		return
	var owner: Dictionary = defenders[lane % defenders.size()]
	if not _spawn(owner,lane,0,0,true):
		return
	var u: Dictionary = units.back()
	u["guardian"] = true
	u["hero_count"] = 20
	u["hp"] *= 20.0
	u["max_hp"] *= 20.0
	u["radius"] *= 2.0
	u["x"] = (WIDTH / 4.0 - 40.0) if team == 0 else (WIDTH * 0.75 + 40.0)
	u["y"] = (lane + 0.5) * LANE_HEIGHT
	u["home_x"] = u["x"]
	_effect("guardian",u["x"],u["y"],team,1.4)

func _fort(lane: int, team: int) -> Dictionary:
	var kind := "forward" if float(forward_hp[lane][team]) > 0.0 else ("turret" if float(turrets[lane][team]) > 0.0 else "core")
	var x := (WIDTH * 0.25 if team == 0 else WIDTH * 0.75) if kind == "forward" else ((215.0 if team == 0 else WIDTH-215.0) if kind == "turret" else (110.0 if team == 0 else WIDTH-110.0))
	return {"kind":kind,"x":x,"y":(lane+0.5)*LANE_HEIGHT,"team":team,"lane":lane}

func _hit_fort(lane: int, team: int, dmg: float, kind: String) -> void:
	if kind == "forward":
		forward_hp[lane][team] = maxf(0.0,float(forward_hp[lane][team])-dmg)
		if float(forward_hp[lane][team]) == 0.0 and not bool(forward_claimed[lane][team]):
			forward_claimed[lane][team] = true
			var enemy: Array[Dictionary] = []
			for p in players:
				if int(p["team"]) == 1-team:
					enemy.append(p)
			for i in range(enemy.size()):
				enemy[i]["cash"] += int(GUARDIAN_REWARD / maxi(1,enemy.size())) + (1 if i < GUARDIAN_REWARD % maxi(1,enemy.size()) else 0)
			spawn_guardian(team,lane)
	elif kind == "turret":
		turrets[lane][team] = maxf(0.0,float(turrets[lane][team])-dmg)
	else:
		cores[lane][team] = maxf(0.0,float(cores[lane][team])-dmg)

func _wave() -> void:
	wave += 1
	_marine_jobs.clear()
	_brood_per_wave.clear()
	_recruits_per_wave.clear()
	for p in players:
		if seconds >= float(p["eco_ready_at"]):
			p["cash"] += 24.0
		if bool(p["bot"]):
			_ai_buy(p)
	for lane in range(lanes):
		for team in range(2):
			var count := _population(lane,team)
			for p in players:
				if int(p["team"]) != team:
					continue
				for slot in range(SLOTS):
					if count >= (220 if lanes == 1 else MAX_UNIT_POP):
						break
					var role: int = p["buildings"][lane][slot]
					if role >= 0 and role < 8:
						if not _spawn(p,lane,slot,role):
							break
						count += 1
						if int(p["faction"]) == 3 and role == 7:
							for time_step in [1,2]:
								_marine_jobs.append({"uid":p["uid"],"lane":lane,"slot":slot,"wave":wave,"due":seconds+8.0*time_step})

func _population(lane: int, team: int) -> int:
	var sum := 0
	for u in units:
		if int(u["lane"]) == lane and int(u["team"]) == team and float(u["hp"]) > 0.0:
			sum += 20 if int(u.get("hero_count",1)) == 20 else 1
	return sum

func _ai_buy(p: Dictionary) -> void:
	# Balance-compatible version of DesertHardAI: bank for a committed purchase,
	# scout actual visible enemies, and counter spam without cheating cash.
	var plan: Dictionary = AI_PLANS[int(p["ai_plan"])]
	var opening: Array = plan["opening"]
	for _buy in range(12 if difficulty == "hard" else 3):
		var counts: Array[int] = [0,0,0,0,0,0,0,0]
		var existing_per_lane: Array[int] = []
		for lane in range(lanes):
			var built := 0
			for r in p["buildings"][lane]:
				if int(r) >= 0 and int(r) < 8:
					counts[int(r)] += 1
					built += 1
			existing_per_lane.append(built)
		var army := _count_builds(p)
		var visible: Array[Dictionary] = []
		var threats: Array[int] = [0,0,0,0,0,0,0,0]
		var air := 0
		var armored := 0
		var invaded := false
		for u in units:
			if int(u["team"]) == int(p["team"]) or not _scouted(u,int(p["team"])):
				continue
			visible.append(u)
			var role: int = u["role"]
			var strength := 20 if int(u.get("hero_count",1)) == 20 else 1
			threats[role] += strength
			if str(u["stats"]["kind"]) == "air":
				air += strength
			if role == 3 or role == 6 and str(u["stats"]["kind"]) == "ground":
				armored += strength
			if (float(u["x"]) <= 580.0 if int(p["team"]) == 0 else float(u["x"]) >= WIDTH-580.0):
				invaded = true
		var role := -1
		var pending: int = p.get("ai_target_role",-1)
		if int(p["ai_opening"]) < opening.size():
			role = int(opening[int(p["ai_opening"])])
		else:
			var concentrated := false
			var dominant := 0
			var seen := 0
			for i in range(8):
				seen += threats[i]
				if threats[i] > threats[dominant]:
					dominant = i
			concentrated = seen >= 6 and float(threats[dominant])/float(maxi(1,seen)) >= 0.65
			var counters: Array = [[1,3],[3,5],[0,1],[2,6],[2,3],[0,6],[4,1],[0,5]][dominant]
			if dominant == 3 and int(p["faction"]) in [3,4,6,7]:
				counters = [2,3]
			var threat_key := "%d:%d:%d" % [int(air >= 2), int(armored >= 2), dominant if concentrated else -1]
			if str(p.get("ai_last_threat","")) != threat_key:
				p["ai_last_threat"] = threat_key
				p["ai_target_role"] = -1
				pending = -1
			var due := int(p["eco"]) < mini(7,1+int(seconds/65.0)) and army >= 2+int(p["eco"])*2 and seconds >= float(p["eco_ready_at"])
			var uncovered_air := air >= 2 and float(counts[4])+float(counts[1])*0.35 < float(air)*0.4
			var uncovered_armor := armored >= 2 and float(counts[2]) < float(armored)*0.35
			var covered := not concentrated or (counts[int(counters[0])]+counts[int(counters[1])] >= ceili(float(army)*0.6))
			if due and not invaded and not uncovered_air and not uncovered_armor and covered:
				role = 8
			else:
				var weights: Array = plan["weights"].duplicate()
				if army < 4:
					weights[7] = 0.0
				if army < 3:
					weights[5] = float(weights[5])*0.35
				if seconds > 120.0:
					weights[5] += 2.0
					weights[7] += 1.5
					weights[3] += 1.0
				if air >= 2:
					weights[4] += minf(7.0,float(air)*1.2)
					weights[1] += 2.0
				if armored >= 2:
					weights[2] += minf(6.0,float(armored))
				if invaded:
					weights[0] += 2.0
					weights[1] += 3.0
					weights[3] += 2.0
					weights[5] *= 0.5
				if concentrated:
					var weight_sum := 0.0
					for weight in weights:
						weight_sum += float(weight)
					for i in range(8):
						weights[i] = float(weights[i])/maxf(0.001,weight_sum)*0.3
					weights[int(counters[0])] += 0.45
					weights[int(counters[1])] += 0.25
				var total := 0.0
				for weight in weights:
					total += float(weight)
				var options: Array = []
				for i in range(8):
					if float(weights[i]) > 0.0:
						options.append({"role":i,"score":float(weights[i])/maxf(0.001,total)*float(army+2)-float(counts[i])})
				options.sort_custom(func(a: Dictionary,b: Dictionary)->bool:return float(a["score"])>float(b["score"]))
				if invaded:
					# Unlike a normal planned purchase, a live base invasion can buy a cheap emergency counter.
					for option in options:
						if float(p["cash"]) >= float(Roster.COST[int(option["role"])]):
							role = int(option["role"])
							break
				else:
					role = pending if pending >= 0 else (int(options[0]["role"]) if not options.is_empty() else -1)
					p["ai_target_role"] = role
		if role < 0:
			break
		var price := eco_price(int(p["eco"])) if role == 8 else int(Roster.COST[role])
		if float(p["cash"]) < price:
			break # Reserve cash for next planned unit instead of endlessly buying cheap infantry.
		var preferred_lane := 0
		var smallest := INF
		for lane in range(lanes):
			var free := false
			for r in p["buildings"][lane]:
				if int(r) == -1:
					free = true
					break
			if not free:
				continue
			# Spread into threatened lines while preserving some momentum on the current front.
			var pressure := 0
			for u in visible:
				if int(u["lane"]) == lane:
					pressure += 1
			var value := float(existing_per_lane[lane]) - minf(5.0,pressure*0.4)
			if value < smallest:
				smallest = value
				preferred_lane = lane
		if smallest == INF:
			break
		var slot := -1
		for i in range(SLOTS):
			if int(p["buildings"][preferred_lane][i]) == -1:
				slot = i
				break
		if slot < 0:
			break
		var result := _build(p,preferred_lane,slot,role)
		if not bool(result["ok"]):
			break
		if role == 8:
			p["ai_target_role"] = -1
		else:
			p["ai_target_role"] = -1
			if int(p["ai_opening"]) < opening.size():
				p["ai_opening"] += 1

func _count_builds(p: Dictionary) -> int:
	var count := 0
	for row in p["buildings"]:
		for r in row:
			if int(r) >= 0 and int(r) < 8:
				count += 1
	return count

func _enemy_invading(team: int) -> bool:
	for u in units:
		if int(u["team"]) != team and (float(u["x"]) <= 580.0 if team == 0 else float(u["x"]) >= WIDTH - 580.0):
			return true
	return false

func _distance(a: Dictionary,b: Dictionary) -> float:
	return Vector2(float(a["x"])-float(b["x"]),float(a["y"])-float(b["y"])).length()

func _damage(v: Dictionary, amount: float, attacker) -> void:
	if float(v.get("hp",0.0)) <= 0.0:
		return
	var f: int = v["faction"]
	var d: Dictionary = v["stats"]
	var mult := 1.0
	if attacker is Dictionary:
		var a: Dictionary = attacker
		var role: int = a["role"]
		var victim_role: int = v["role"]
		if victim_role == 6 and f in [3,4,6,7]:
			mult = 1.65 if role == 2 else (0.68 if role == 0 else (0.78 if role == 4 else 1.0))
		else:
			var good: Array = a["stats"].get("good",GOODS[role])
			var bad: Array = a["stats"].get("bad",BADS[role])
			if victim_role in good:
				mult *= 1.55
			if victim_role in bad:
				mult *= 0.70
	var armor: float = float(d["armor"])
	var shots := 1
	if attacker is Dictionary and int(attacker.get("hero_count",1)) == 20:
		shots = clampi(ceili(float(attacker["hp"]) / maxf(1.0,float(attacker["max_hp"])/20.0) - 0.00001),1,20)
	# Web DesertConsolidation.hit(): minimum damage per projectile;
	# 20-unit hero is one grouped sprite, not twenty armor layers.
	var effective_armor := armor / 20.0 if int(v.get("hero_count",1)) == 20 else armor
	var damage := maxf(3.0*shots,amount*mult - effective_armor * 0.66 * shots)
	if f == 4 and attacker is Dictionary and float(attacker["stats"]["range"]) >= 48.0:
		damage *= 0.94
	if f == 0 and int(v["role"]) in [3,4]:
		damage *= 0.94
	if f == 2 and seconds - float(v.get("last_ward",-999.0)) >= 10.0:
		v["last_ward"] = seconds
		damage *= 0.82
	if attacker is Dictionary:
		var a: Dictionary = attacker
		if int(a["faction"]) == 5 and int(a["role"]) in [1,2,4,5,6] and randf()<0.12:
			damage *= 1.25
		if int(a["faction"]) == 6 and int(a["role"]) in [0,3,6]:
			for ally in units:
				if ally != a and float(ally["hp"]) > 0.0 and int(ally["team"]) == int(a["team"]) and int(ally["faction"]) == 6 and _distance(a,ally) < 165.0:
					damage *= 1.06
					break
		if float(a.get("ink_until",0.0)) > seconds:
			damage *= 0.90
	var prior: float = v["hp"]
	v["hp"] -= damage
	v["last_damage"] = seconds
	v["action"] = "hit"
	v["action_ttl"] = 0.30
	if attacker is Dictionary:
		var a: Dictionary = attacker
		if int(a["faction"]) == 4 and int(a["role"]) in [0,3,6] and not bool(a.get("hatchling",false)):
			a["hp"] = minf(float(a["max_hp"]), float(a["hp"]) + minf(3.0 * int(a.get("hero_count",1)),maxf(0.0,minf(prior,damage))*0.015))
		if int(a["faction"]) == 8 and int(a["role"]) in [1,2,4,5] and seconds - float(a.get("last_ink",-999.0)) >= 5.0:
			a["last_ink"] = seconds
			v["ink_until"] = maxf(float(v.get("ink_until",0.0)), seconds + 2.5)
			_effect("ink",v["x"],v["y"],int(a["team"]),0.6)
		if float(v["hp"]) <= 0.0 and not bool(v.get("killed",false)):
			v["killed"] = true
			if int(a["faction"]) == 3:
				_marine_spoils(a,v)

func _marine_spoils(a: Dictionary,v: Dictionary) -> void:
	if bool(a.get("guardian",false)) or bool(a.get("conscripted",false)) or bool(v.get("conscripted",false)) or bool(v.get("hatchling",false)) or bool(v.get("guardian",false)):
		return
	var owner := player_for(str(a["uid"]))
	var enemy := player_for(str(v["uid"]))
	if owner.is_empty() or enemy.is_empty():
		return
	if randf() < 0.08:
		var taken := mini(24,mini(int(float(enemy["cash"])),floori(float(Roster.COST[int(v["role"])])*0.12)))
		owner["cash"] += taken
		enemy["cash"] -= taken
		_effect("spoils",v["x"],v["y"],int(a["team"]),0.5)
	var n := int(_recruits_per_wave.get(str(a["uid"]),0))
	if n < 2 and randf() < 0.23 and _population(int(v["lane"]),int(a["team"])) < MAX_UNIT_POP:
		_recruits_per_wave[str(a["uid"])] = n + 1
		var copy: Dictionary = v.duplicate(true)
		copy["id"] = next_unit_id
		copy["uid"] = a["uid"]
		copy["team"] = a["team"]
		copy["skin"] = a.get("skin","default")
		copy["max_hp"] = float(v["max_hp"]) / float(maxi(1,int(v.get("hero_count",1))))
		copy["hp"] = maxf(1.0,float(copy["max_hp"]) * 0.1)
		copy["radius"] = float(v["radius"]) * (0.5 if int(v.get("hero_count",1)) == 20 else 1.0)
		copy["killed"] = false
		copy["conscripted"] = true
		copy["hero_count"] = 1
		copy["action"] = "move"
		units.append(copy)
		next_unit_id += 1

func _attack(a: Dictionary, v: Dictionary) -> void:
	var stats: Dictionary = a["stats"]
	var owner := player_for(str(a["uid"]))
	var weapon := int(owner.get("weapon",0))
	var heroes := 1
	if int(a.get("hero_count",1)) == 20:
		heroes = maxi(1,ceili(float(a["hp"]) / maxf(1.0,float(a["max_hp"])/20.0) - 0.00001))
	var dmg := float(stats["damage"]) * float(heroes) * (1.0 + 0.08 * weapon)
	a["cool"] = maxf(0.3,float(stats["rate"]))
	a["action"] = "skill" if int(a["role"]) in [5,7] else "attack"
	a["action_ttl"] = 0.4
	if int(a["role"]) == 7:
		_heal(a,v, float(stats["heal"]) * heroes * (1.0 + 0.08 * weapon))
	elif int(a["role"]) == 5:
		for u in units:
			if int(u["team"]) != int(a["team"]) and str(u["stats"]["kind"]) != "air" and _distance(u,v) < 66.0:
				_damage(u,dmg*0.8,a)
	elif int(a["role"]) == 6 and int(a["faction"]) in [3,4]:
		var count := 0
		for u in units:
			if int(u["team"]) != int(a["team"]) and str(u["stats"]["kind"]) == "ground" and _distance(u,v) < 58.0 and count < 3:
				var bonus := 1.35 if int(u["role"]) == 0 else (0.55 if int(u["role"]) == 3 else 1.0)
				_damage(u,dmg*bonus,a)
				count += 1
	else:
		_damage(v,dmg,a)
	if int(a["faction"]) == 1 and int(a["role"]) != 7 and not bool(a.get("hatchling",false)) and not bool(a.get("conscripted",false)) and not bool(a.get("guardian",false)):
		_brood_spawn(a)
	_effect("hit",v["x"],v["y"],int(a["team"]),0.3)

func _heal(a: Dictionary,v: Dictionary, amount: float) -> void:
	if bool(v.get("hatchling",false)):
		return
	if int(a["faction"]) == 3:
		var restored := 0.0
		for friend in units:
			if friend != a and int(friend["team"]) == int(a["team"]) and float(friend["hp"]) < float(friend["max_hp"]) and _distance(a,friend) < 195.0:
				var before: float = friend["hp"]
				var value := maxf(135.0,float(friend["max_hp"]) * 0.32) * int(a.get("hero_count",1))
				friend["hp"] = minf(float(friend["max_hp"]),before + _guardian_heal(friend,value))
				restored += float(friend["hp"]) - before
		if restored > 0.0:
			a["hp"] = 0.0
			_effect("huanglong",a["x"],a["y"],int(a["team"]),0.9)
		return
	if seconds - float(v.get("heal_window",-999.0)) >= 1.0:
		v["heal_window"] = seconds
		v["heal_used"] = 0.0
	var budget := maxf(80.0 * int(v.get("hero_count",1)),float(v["max_hp"])*0.085)
	amount = maxf(0.0,minf(amount,budget-float(v.get("heal_used",0.0))))
	v["heal_used"] = float(v.get("heal_used",0.0)) + amount
	var prior: float = v["hp"]
	v["hp"] = minf(float(v["max_hp"]),prior + _guardian_heal(v,amount))
	if int(a["faction"]) == 9 and seconds - float(a.get("last_pollen",-999.0)) >= 5.0:
		for mate in units:
			if mate != a and mate != v and int(mate["team"]) == int(a["team"]) and float(mate["hp"]) < float(mate["max_hp"]) and _distance(mate,v) < 145.0:
				a["last_pollen"] = seconds
				mate["hp"] = minf(float(mate["max_hp"]),float(mate["hp"])+_guardian_heal(mate,(float(v["hp"])-prior)*0.05))
				_effect("pollen",mate["x"],mate["y"],int(a["team"]),0.45)
				break

func _guardian_heal(u: Dictionary, amount: float) -> float:
	if not bool(u.get("guardian",false)):
		return amount
	return amount*(0.10 if seconds-float(u.get("last_damage",-999.0))<3.0 else 0.25)

func _brood_spawn(a: Dictionary) -> void:
	var uid := str(a["uid"])
	if int(_brood_per_wave.get(uid,0)) >= 10 or seconds - float(a["last_brood"]) < 11.0:
		return
	var brood_count := 0
	for u in units:
		if bool(u.get("hatchling",false)) and str(u["uid"]) == uid:
			brood_count += 1
	if brood_count >= 14 or _population(int(a["lane"]),int(a["team"])) >= MAX_UNIT_POP or randf() >= 0.20:
		return
	_brood_per_wave[uid] = int(_brood_per_wave.get(uid,0)) + 1
	_brood_total[uid] = int(_brood_total.get(uid,0)) + 1
	a["last_brood"] = seconds
	var hatch: Dictionary = a.duplicate(true)
	hatch["id"] = next_unit_id
	next_unit_id += 1
	hatch["role"] = 0
	hatch["hp"] = 1.0
	hatch["max_hp"] = 1.0
	hatch["hatchling"] = true
	hatch["guardian"] = false
	hatch["hero_count"] = 1
	hatch["radius"] = 8.0
	hatch["stats"] = Roster.definition(int(a["faction"]),0)
	hatch["stats"]["damage"] = 5.0
	hatch["stats"]["speed"] = 108.0
	hatch["stats"]["range"] = 24.0
	hatch["stats"]["rate"] = 1.28
	hatch["x"] = clampf(float(a["x"])+18.0*(1 if int(a["team"]) == 0 else -1),35.0,WIDTH-35.0)
	units.append(hatch)

func _tick_units(dt: float) -> void:
	for u in units:
		if float(u["hp"]) <= 0.0:
			continue
		var faction: int = u["faction"]
		if faction == 8 and not bool(u.get("hatchling",false)):
			u["hp"] = minf(float(u["max_hp"]),float(u["hp"])+float(u["max_hp"])*0.0006*dt)
		elif faction == 7 and not bool(u.get("hatchling",false)):
			u["hp"] = minf(float(u["max_hp"]),float(u["hp"])+float(u["max_hp"])*0.0015*dt)
		u["cool"] = maxf(0.0,float(u["cool"])-dt)
		u["action_ttl"] = maxf(0.0,float(u.get("action_ttl",0.0))-dt)
		var supporting := int(u["role"]) == 7
		var stats: Dictionary = u["stats"]
		var target: Dictionary = {}
		var best := 615.0 if supporting else 590.0
		for v in units:
			if v == u or float(v["hp"]) <= 0.0:
				continue
			if supporting:
				if int(v["team"]) != int(u["team"]) or float(v["hp"]) >= float(v["max_hp"])-10.0 or bool(v.get("hatchling",false)):
					continue
			else:
				if int(v["team"]) == int(u["team"]) or str(v["stats"]["kind"]) == "air" and not bool(stats["air_target"]):
					continue
				if bool(u.get("guardian",false)) and int(v["lane"]) != int(u["lane"]):
					continue
				if bool(u.get("guardian",false)) and int(u["team"]) == 0 and float(v["x"]) > WIDTH*0.5 + float(stats["range"])*0.88:
					continue
				if bool(u.get("guardian",false)) and int(u["team"]) == 1 and float(v["x"]) < WIDTH*0.5 - float(stats["range"])*0.88:
					continue
			var dist := _distance(u,v)
			if dist < best:
				best = dist
				target = v
		var speed := float(stats["speed"]) * (0.8 if float(u.get("ink_until",0.0)) > seconds else 1.0)
		if not target.is_empty():
			var reach := float(stats["range"])*0.88
			if best <= reach:
				if float(u["cool"]) <= 0.0:
					_attack(u,target)
				elif float(u["action_ttl"]) <= 0.0:
					u["action"] = "idle"
			else:
				var step := minf(speed*dt,maxf(0.0,best-reach*0.68))
				u["x"] += (float(target["x"])-float(u["x"])) / maxf(1.0,best) * step
				u["y"] += (float(target["y"])-float(u["y"])) / maxf(1.0,best) * step
				u["action"] = "move"
		elif bool(u.get("guardian",false)):
			var x: float = u["home_x"]
			var y := (int(u["lane"])+0.5)*LANE_HEIGHT
			var d := Vector2(x-float(u["x"]),y-float(u["y"]))
			var move := d.limit_length(speed*dt)
			u["x"] += move.x
			u["y"] += move.y
			u["action"] = "move" if d.length()>2.0 else "idle"
		elif supporting:
			# Web supports must follow the active army across all three bands,
			# otherwise the healer remains at spawn and never contributes.
			var escort: Dictionary = {}
			var closest := INF
			for ally in units:
				if ally == u or float(ally["hp"]) <= 0.0 or int(ally["team"]) != int(u["team"]) or int(ally["role"]) == 7:
					continue
				var distance := _distance(u,ally)
				if distance < closest:
					closest = distance
					escort = ally
			if not escort.is_empty() and closest > 115.0:
				var step := minf(speed*dt,closest-105.0)
				u["x"] += (float(escort["x"])-float(u["x"]))/maxf(1.0,closest)*step
				u["y"] += (float(escort["y"])-float(u["y"]))/maxf(1.0,closest)*step
				u["action"] = "move"
			else:
				u["action"] = "idle"
		else:
			var side: int = u["team"]
			var lane := clampi(int(float(u["y"]) / LANE_HEIGHT),0,lanes-1)
			var defender := 1-side
			if float(cores[lane][defender]) > 0.0:
				var objective := _fort(lane,defender)
				var d := Vector2(float(objective["x"])-float(u["x"]),float(objective["y"])-float(u["y"]))
				if d.length() > maxf(48.0,float(stats["range"])*0.85):
					var movement := d.limit_length(speed*dt)
					u["x"] += movement.x
					u["y"] += movement.y
					u["action"] = "move"
				elif float(u["cool"]) <= 0.0:
					var m: Array = [0.52,0.88,1.12,1.08,0.82,1.55,0.87,0.40]
					_hit_fort(lane,defender,float(stats["damage"])*float(m[int(u["role"])])*int(u.get("hero_count",1)),str(objective["kind"]))
					u["cool"] = stats["rate"]
					u["action"] = "attack"
					u["action_ttl"] = 0.3
			else:
				for next_lane in range(lanes):
					if float(cores[next_lane][defender]) > 0.0:
						u["y"] += clampf((next_lane+0.5)*LANE_HEIGHT-float(u["y"]),-speed*dt,speed*dt)
						u["action"] = "move"
						break
		u["x"] = clampf(float(u["x"]),35.0,WIDTH-35.0)
		u["y"] = clampf(float(u["y"]),35.0,lanes*LANE_HEIGHT-35.0)
		if bool(u.get("guardian",false)):
			var radius := maxf(68.0,float(u["radius"]))
			u["x"] = clampf(float(u["x"]),35.0 if int(u["team"]) == 0 else WIDTH*0.5+radius,WIDTH*0.5-radius if int(u["team"]) == 0 else WIDTH-35.0)
			u["y"] = clampf(float(u["y"]),int(u["lane"])*LANE_HEIGHT+radius,(int(u["lane"])+1)*LANE_HEIGHT-radius)
		else:
			u["lane"] = clampi(int(float(u["y"])/LANE_HEIGHT),0,lanes-1)
	_collision()
	_towers(dt)
	_remove_dead()

func _collision() -> void:
	# Local separation prevents 20x heroes and infantry from occupying the same point.
	# Bounded neighbor count avoids quadratic explosion in large 3-line co-op battles.
	for i in range(units.size()):
		var a: Dictionary = units[i]
		if float(a["hp"]) <= 0:
			continue
		var seen := 0
		for j in range(i+1,units.size()):
			var b: Dictionary = units[j]
			if float(b["hp"]) <= 0 or str(a["stats"]["kind"]) != str(b["stats"]["kind"]):
				continue
			var dx: float = float(b["x"])-float(a["x"])
			var dy: float = float(b["y"])-float(a["y"])
			if absf(dx) > 72.0 or absf(dy) > 72.0:
				continue
			var length := sqrt(dx*dx+dy*dy)
			var distance: float = float(a["radius"])+float(b["radius"])
			if length >= distance:
				continue
			if length < 0.1:
				dx = 1.0
				dy = 0.0
				length = 1.0
			var push := minf(16.0,(distance-length)*0.47)
			a["x"] = clampf(float(a["x"])-dx/length*push,35.0,WIDTH-35.0)
			a["y"] = clampf(float(a["y"])-dy/length*push,35.0,lanes*LANE_HEIGHT-35.0)
			b["x"] = clampf(float(b["x"])+dx/length*push,35.0,WIDTH-35.0)
			b["y"] = clampf(float(b["y"])+dy/length*push,35.0,lanes*LANE_HEIGHT-35.0)
			seen += 1
			if seen >= 10:
				break

func _towers(dt: float) -> void:
	for lane in range(lanes):
		for team in range(2):
			for forward in [false,true]:
				var hp: Array = forward_hp[lane] if forward else turrets[lane]
				var cd: Array = forward_cool[lane] if forward else turret_cool[lane]
				if float(hp[team]) <= 0:
					continue
				cd[team] = maxf(0.0,float(cd[team])-dt)
				if float(cd[team]) > 0.0:
					continue
				var pos := Vector2((WIDTH*0.25 if team == 0 else WIDTH*0.75) if forward else (215.0 if team == 0 else WIDTH-215.0),(lane+0.5)*LANE_HEIGHT)
				var nearest: Dictionary = {}
				var best := 285.0
				for v in units:
					if int(v["team"]) == team or float(v["hp"]) <= 0:
						continue
					var distance := pos.distance_to(Vector2(float(v["x"]),float(v["y"])))
					if distance < best:
						best = distance
						nearest = v
				if nearest.is_empty():
					continue
				var amount := 27.0*(0.75 if forward else 1.0)*(1.25 if str(nearest["stats"]["kind"]) == "air" else 1.0)
				_damage(nearest,amount,null)
				cd[team] = 0.34
				_effect("tower",nearest["x"],nearest["y"],team,0.16)

func _remove_dead() -> void:
	var surviving: Array[Dictionary] = []
	for u in units:
		if float(u["hp"]) > 0.0:
			surviving.append(u)
		else:
			_effect("death",u["x"],u["y"],int(u["team"]),0.72,int(u["faction"]),int(u["role"]),str(u.get("skin","default")))
	units = surviving

func _effect(kind: String, x: float, y: float, team: int, duration: float = 0.5, faction: int = -1, role: int = -1, skin: String = "default") -> void:
	if effects.size() > 150:
		effects.pop_front()
	effects.append({"kind":kind,"x":x,"y":y,"lane":clampi(int(y/LANE_HEIGHT),0,lanes-1),"team":team,"time":duration,"max_time":duration,"faction":faction,"role":role,"skin":skin})

func _compact_heroes() -> void:
	var groups: Dictionary = {}
	for u in units:
		if float(u["hp"]) < float(u["max_hp"])-0.001 or int(u.get("hero_count",1)) != 1 or bool(u.get("conscripted",false)) or bool(u.get("hatchling",false)) or bool(u.get("guardian",false)):
			continue
		var key := "%s|%d|%d|%d|%d" % [str(u["uid"]),int(u["team"]),int(u["faction"]),int(u["role"]),int(u["lane"])]
		if not groups.has(key):
			groups[key] = []
		groups[key].append(u)
	var absorbed: Dictionary = {}
	for group in groups.values():
		if group.size() < 20:
			continue
		for seed in group:
			if absorbed.has(seed["id"]) or int(seed.get("hero_count",1)) != 1:
				continue
			var team: Array = [seed]
			for u in group:
				if u == seed or absorbed.has(u["id"]):
					continue
				if _distance(u,seed) <= 180.0:
					team.append(u)
				if team.size() >= 20:
					break
			if team.size() != 20:
				continue
			var pos := Vector2.ZERO
			for soldier in team:
				pos += Vector2(float(soldier["x"]),float(soldier["y"]))
			seed["x"] = pos.x/20.0
			seed["y"] = pos.y/20.0
			seed["hp"] *= 20.0
			seed["max_hp"] *= 20.0
			seed["radius"] *= 2.0
			seed["hero_count"] = 20
			seed["action"] = "skill"
			seed["action_ttl"] = 0.6
			for soldier in team.slice(1):
				absorbed[soldier["id"]] = true
			_effect("hero",seed["x"],seed["y"],int(seed["team"]),1.0)
	if absorbed.is_empty():
		return
	var remaining: Array[Dictionary] = []
	for u in units:
		if not absorbed.has(u["id"]):
			remaining.append(u)
	units = remaining

func _marine_supports() -> void:
	var remaining: Array[Dictionary] = []
	for job in _marine_jobs:
		if int(job["wave"]) != wave:
			continue
		if seconds < float(job["due"]):
			remaining.append(job)
			continue
		var p := player_for(str(job["uid"]))
		if not p.is_empty() and int(p["faction"]) == 3 and int(p["buildings"][int(job["lane"])][int(job["slot"])]) == 7 and _population(int(job["lane"]),int(p["team"])) < MAX_UNIT_POP:
			_spawn(p,int(job["lane"]),int(job["slot"]),7)
	_marine_jobs = remaining

func advance(dt: float) -> void:
	if ended:
		return
	dt = clampf(dt,0.0,0.2)
	seconds += dt
	next_wave -= dt
	_econ_timer += dt
	_ai_timer += dt
	_consolidate_timer += dt
	for p in players:
		p["barrage_cd"] = maxf(0.0,float(p["barrage_cd"])-dt)
	while _econ_timer >= 0.5:
		_econ_timer -= 0.5
		for p in players:
			if seconds >= float(p["eco_ready_at"]):
				p["cash"] += 1.0 + int(p["eco"])
	if difficulty == "hard" and _ai_timer >= 1.0:
		_ai_timer -= 1.0
		for p in players:
			if bool(p["bot"]):
				_ai_buy(p)
	if _consolidate_timer >= 1.0:
		_consolidate_timer -= 1.0
		_compact_heroes()
	while next_wave <= 0:
		next_wave += WAVE_SECONDS
		_wave()
	_marine_supports()
	_tick_units(dt)
	var kept: Array[Dictionary] = []
	for effect in effects:
		effect["time"] = float(effect["time"])-dt
		if float(effect["time"]) > 0.0:
			kept.append(effect)
	effects = kept
	var lost := [0,0]
	for row in cores:
		if float(row[0]) <= 0.0:
			lost[0] += 1
		if float(row[1]) <= 0.0:
			lost[1] += 1
	var required := 1 if lanes == 1 else 2
	if lost[0] >= required or lost[1] >= required:
		ended = true
		winner = 0 if lost[1] >= required else 1
	if seconds >= 1200.0:
		ended = true
		var scores := [0.0,0.0]
		for row in cores:
			for team in range(2):
				scores[team] += float(row[team])
		winner = 0 if scores[0] > scores[1] else (1 if scores[1] > scores[0] else -1)

func snapshot(viewer_uid: String = "") -> Dictionary:
	var viewer := player_for(viewer_uid)
	var visible := []
	for lane in range(lanes):
		var spotted := viewer.is_empty() or wave >= 6
		if not spotted:
			for u in units:
				if int(u["team"]) == int(viewer["team"]) and int(u["lane"]) == lane:
					if (float(u["x"]) >= WIDTH-990.0 if int(viewer["team"]) == 0 else float(u["x"]) <= 990.0):
						spotted = true
						break
		visible.append(spotted)
	var safe_players: Array = []
	for p in players:
		var entry: Dictionary = {
			"uid":p["uid"],"name":p["name"],"team":p["team"],
			"faction":p["faction"],"skin":p.get("skin","default"),
			"bot":p["bot"],"cash":p["cash"],"eco":p["eco"],
			"eco_ready_at":p["eco_ready_at"],"weapon":p["weapon"],
			"armor":p["armor"],"nukes":p["nukes"],
			"barrage_cd":p["barrage_cd"],
			"buildings":p["buildings"].duplicate(true)
		}
		if not viewer.is_empty() and int(p["team"]) != int(viewer["team"]):
			entry["cash"] = -1.0
			entry["eco"] = -1
			entry["weapon"] = -1
			entry["armor"] = -1
			entry["nukes"] = -1
			entry["eco_ready_at"] = -1.0
			entry["barrage_cd"] = -1.0
			for lane in range(lanes):
				if not bool(visible[lane]):
					var row: Array = []
					row.resize(SLOTS)
					row.fill(-1)
					entry["buildings"][lane] = row
		safe_players.append(entry)
	var safe_units: Array = []
	for u in units:
		var lane: int = u["lane"]
		if not viewer.is_empty() and int(u["team"]) != int(viewer["team"]) and not bool(visible[lane]) and (float(u["x"]) >= WIDTH-770.0 if int(viewer["team"]) == 0 else float(u["x"]) <= 770.0):
			continue
		safe_units.append({
			"id":u["id"], "uid":u["uid"],"team":u["team"],
			"faction":u["faction"],"role":u["role"],
			"skin":u.get("skin","default"),"lane":u["lane"],
			"x":roundf(float(u["x"])), "y":roundf(float(u["y"])),
			"hp":ceilf(float(u["hp"])), "max_hp":ceilf(float(u["max_hp"])),
			"action":u.get("action","idle"),
			"action_ttl":u.get("action_ttl",0.0),
			"hero_count":u.get("hero_count",1),
			"guardian":u.get("guardian",false),
			"conscripted":u.get("conscripted",false),
			"hatchling":u.get("hatchling",false)
		})
	return {
		"protocol":2, "mode":mode, "size":size, "lanes":lanes, "width":WIDTH,
		"height":LANE_HEIGHT*lanes, "seconds":seconds, "wave":wave,
		"next_wave":next_wave,"ended":ended,"winner":winner,
		"cores":cores.duplicate(true),"turrets":turrets.duplicate(true),
		"forward_hp":forward_hp.duplicate(true),
		"players":safe_players,"units":safe_units,"effects":effects.duplicate(true),
		"fog":visible.map(func(x: bool)->bool:return not x),
		"brood_total":_brood_total.duplicate(true)
	}

func load_snapshot(state: Dictionary) -> void:
	mode = str(state.get("mode",mode))
	size = int(state.get("size",size))
	lanes = int(state.get("lanes",lanes))
	seconds = float(state.get("seconds",seconds))
	wave = int(state.get("wave",wave))
	next_wave = float(state.get("next_wave",next_wave))
	ended = bool(state.get("ended",ended))
	winner = int(state.get("winner",winner))
	cores = state.get("cores",cores).duplicate(true)
	turrets = state.get("turrets",turrets).duplicate(true)
	forward_hp = state.get("forward_hp",forward_hp).duplicate(true)
	players.clear()
	for p in state.get("players",[]):
		players.append(p)
	units.clear()
	for u in state.get("units",[]):
		units.append(u)
	effects.clear()
	for e in state.get("effects",[]):
		effects.append(e)
