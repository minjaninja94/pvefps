extends RefCounted
## Standalone playable single-lane combat slice. Not yet feature-equivalent with web version.
const Roster = preload("res://scripts/roster.gd")
const SLOTS := 75
const STEP := 0.05
var seconds := 0.0
var wave := 0
var cash := [360.0, 360.0]
var cores := [7200.0, 7200.0]
var towers := [1250.0, 1250.0]
var tower_cool := [0.0, 0.0]
var eco := [0, 0]
var weapons := [0, 0]
var armor_levels := [0, 0]
var builds := [[], []]
var units: Array[Dictionary] = []
var death_effects: Array[Dictionary] = []
var next_id := 1
var player_faction := 0
var enemy_faction := 1
var player_skin := "default"
var enemy_skin := "default"
var ended := false
var winner := -1
var message := "생산 슬롯을 선택해 유닛을 배치하세요."
var _income_tick := 0.0
var _ai_tick := 0.0
var versus_player := false
var _elapsed_wave := 0.0

func _init(faction: int = 0, rival: int = 1, first_skin: String = "default", second_skin: String = "default") -> void:
	player_faction = clampi(faction, 0, 9)
	enemy_faction = clampi(rival, 0, 9)
	player_skin = first_skin if first_skin in ["default","moe"] else "default"
	enemy_skin = second_skin if second_skin in ["default","moe"] else "default"
	for side in range(2):
		var slots: Array[int] = []
		slots.resize(SLOTS)
		slots.fill(-1)
		builds[side] = slots

func cost_for(team: int, role: int) -> int:
	if role == 8:
		return roundi(70.0 * pow(1.36, eco[team]))
	return int(Roster.COST[role])

func purchase(slot: int, role: int) -> bool:
	return purchase_for_team(0, slot, role)

## All orders are validated by the authority, never by the remote client.
func purchase_for_team(team: int, slot: int, role: int) -> bool:
	if team < 0 or team > 1 or ended or slot < 0 or slot >= SLOTS or role < -1 or role > 8:
		message = "잘못된 건설 명령입니다."
		return false
	if role != -1 and int(builds[team][slot]) >= 0:
		message = "기존 시설을 먼저 철거하세요."
		return false
	if role == -1:
		var old_role: int = builds[team][slot]
		if old_role < 0:
			message = "이 슬롯은 비어 있습니다."
			return false
		var refund := roundi(float(Roster.COST[old_role]) * 0.55)
		cash[team] += refund
		if old_role == 8:
			eco[team] -= 1
		builds[team][slot] = -1
		message = "시설 철거 완료 (+%d CR)" % refund
		return true
	if role == 8 and eco[team] >= 7:
		message = "자원채취 시설은 최대 7개입니다."
		return false
	var price := cost_for(team, role)
	if cash[team] < price:
		message = "자원이 부족합니다. (%d CR 필요)" % price
		return false
	cash[team] -= price
	builds[team][slot] = role
	if role == 8:
		eco[team] += 1
	message = "%s 건설 완료" % Roster.ROLE_NAMES[role]
	return true

func upgrade(kind: String) -> bool:
	return upgrade_for_team(0, kind)

func upgrade_for_team(team: int, kind: String) -> bool:
	if team < 0 or team > 1 or ended or kind not in ["weapon", "armor"]:
		message = "잘못된 강화 명령입니다."
		return false
	var level: int = weapons[team] if kind == "weapon" else armor_levels[team]
	if level >= 5:
		message = "최대 강화 단계입니다."
		return false
	var cost := roundi((200.0 if kind == "weapon" else 190.0) * pow(1.65 if kind == "weapon" else 1.63, level))
	if cash[team] < cost:
		message = "강화 비용 %d CR이 부족합니다." % cost
		return false
	cash[team] -= cost
	if kind == "weapon":
		weapons[team] += 1
	else:
		armor_levels[team] += 1
		for u in units:
			if u["team"] == team:
				var increase: float = float(u["max_hp"]) * 0.09 / (1.0 + level * 0.09)
				u["max_hp"] += increase
				u["hp"] += increase
	message = "%s 강화 성공" % ("무기" if kind == "weapon" else "장갑")
	return true

## Serializable, read-only match snapshot; no scripts or arbitrary nodes are sent.
func snapshot() -> Dictionary:
	return {
		"seconds": seconds, "wave": wave, "cash": cash.duplicate(),
		"cores": cores.duplicate(), "towers": towers.duplicate(),
		"eco": eco.duplicate(), "weapons": weapons.duplicate(),
		"armor_levels": armor_levels.duplicate(),
		"builds": [builds[0].duplicate(), builds[1].duplicate()],
		"units": units.duplicate(true), "death_effects": death_effects.duplicate(true), "ended": ended, "winner": winner,
		"message": message, "faction0": player_faction, "faction1": enemy_faction,
		"skin0": player_skin, "skin1": enemy_skin,
		"elapsed_wave": _elapsed_wave
	}

func load_snapshot(data: Dictionary) -> void:
	seconds = float(data.get("seconds", seconds))
	wave = int(data.get("wave", wave))
	cash = data.get("cash", cash).duplicate()
	cores = data.get("cores", cores).duplicate()
	towers = data.get("towers", towers).duplicate()
	eco = data.get("eco", eco).duplicate()
	weapons = data.get("weapons", weapons).duplicate()
	armor_levels = data.get("armor_levels", armor_levels).duplicate()
	var incoming: Array = data.get("builds", [])
	if incoming.size() == 2:
		builds[0] = incoming[0].duplicate()
		builds[1] = incoming[1].duplicate()
	units.clear()
	for item in data.get("units", []):
		if typeof(item) == TYPE_DICTIONARY:
			units.append(item)
	death_effects.clear()
	for item in data.get("death_effects", []):
		if typeof(item) == TYPE_DICTIONARY:
			death_effects.append(item)
	ended = bool(data.get("ended", ended))
	winner = int(data.get("winner", winner))
	message = str(data.get("message", message))
	player_faction = int(data.get("faction0", player_faction))
	enemy_faction = int(data.get("faction1", enemy_faction))
	player_skin = str(data.get("skin0", player_skin))
	enemy_skin = str(data.get("skin1", enemy_skin))
	_elapsed_wave = float(data.get("elapsed_wave", _elapsed_wave))

func advance(dt: float) -> void:
	if ended:
		return
	seconds += dt
	_elapsed_wave += dt
	_income_tick += dt
	_ai_tick += dt
	if _income_tick >= 0.5:
		_income_tick -= 0.5
		for side in range(2):
			cash[side] += 1.0 + float(eco[side])
	if _ai_tick >= 2.0:
		_ai_tick -= 2.0
		if not versus_player:
			_ai_action()
	if _elapsed_wave >= Roster.WAVE_PERIOD:
		_elapsed_wave -= Roster.WAVE_PERIOD
		wave += 1
		for side in range(2):
			cash[side] += 24.0
			for slot in range(SLOTS):
				var role: int = builds[side][slot]
				if role >= 0 and role < 8 and units.size() < 480:
					_spawn(side, slot, role)
		if wave >= 22:
			_finish(0 if cores[0] > cores[1] else (1 if cores[1] > cores[0] else -1))
			return
	_run_units(dt)
	_run_towers(dt)
	_remove_dead()
	_age_deaths(dt)
	if cores[0] <= 0:
		_finish(1)
	elif cores[1] <= 0:
		_finish(0)

func _spawn(team: int, slot: int, role: int) -> void:
	var faction: int = player_faction if team == 0 else enemy_faction
	var stats: Dictionary = Roster.definition(faction, role)
	var hp: float = stats["hp"] * (1.0 + float(armor_levels[team]) * 0.09)
	var x: float = (235.0 + float(slot % 15) * 4.0) if team == 0 else (Roster.WORLD_WIDTH - 235.0 - float(slot % 15) * 4.0)
	var y: float = 265.0 + float((int(slot / 15) * 11 + (slot % 15) * 21) % 196) - 98.0
	units.append({
		"id": next_id, "team": team, "role": role, "faction": faction,
		"skin": player_skin if team == 0 else enemy_skin,
		"x": x, "y": y, "hp": hp, "max_hp": hp, "cool": 0.15 * float(slot % 4),
		"stats": stats, "action": "spawn", "action_ttl": 0.3
	})
	next_id += 1

func _ai_action() -> void:
	var priorities := [1, 0, 3, 2, 5, 4, 7, 6]
	var placed := 0
	for slot in range(SLOTS):
		if int(builds[1][slot]) >= 0:
			placed += 1
	if placed >= min(24, 2 + int(seconds / 55.0)):
		return
	var role: int = priorities[placed % priorities.size()]
	var cost := cost_for(1, role)
	if cash[1] >= cost:
		for slot in range(SLOTS):
			if int(builds[1][slot]) == -1:
				builds[1][slot] = role
				cash[1] -= cost
				break

func _run_units(dt: float) -> void:
	for u in units:
		if float(u["hp"]) <= 0.0:
			continue
		var stats: Dictionary = u["stats"]
		u["cool"] = maxf(0.0, float(u["cool"]) - dt)
		u["action_ttl"] = maxf(0.0, float(u.get("action_ttl", 0.0)) - dt)
		if int(u["role"]) == 7:
			_heal_ally(u)
			continue
		var target: Dictionary = {}
		var best := float(stats["range"])
		for v in units:
			if float(v["hp"]) <= 0.0 or int(v["team"]) == int(u["team"]):
				continue
			if str(v["stats"]["kind"]) == "air" and not bool(stats["air_target"]):
				continue
			var dx: float = absf(float(v["x"]) - float(u["x"]))
			var dy: float = absf(float(v["y"]) - float(u["y"])) * 1.5
			var dist := sqrt(dx * dx + dy * dy)
			if dist < best:
				best = dist
				target = v
		if not target.is_empty():
			if float(u["cool"]) <= 0.0:
				u["action"] = "skill" if float(stats["blast"]) > 0.0 else "attack"
				u["action_ttl"] = 0.45
				var dmg: float = float(stats["damage"]) * (1.0 + float(weapons[int(u["team"])]) * 0.08)
				_damage(target, dmg)
				u["cool"] = stats["rate"]
				if float(stats["blast"]) > 0.0:
					for v in units:
						if v != target and int(v["team"]) != int(u["team"]) and float(v["hp"]) > 0.0 and str(v["stats"]["kind"]) != "air":
							if absf(float(v["x"]) - float(target["x"])) < float(stats["blast"]) and absf(float(v["y"]) - float(target["y"])) < float(stats["blast"]):
								_damage(v, dmg * 0.40)
			if float(u["action_ttl"]) <= 0.0:
				u["action"] = "idle"
			continue
		var team: int = u["team"]
		var at_core: bool = float(u["x"]) <= 140.0 if team == 1 else float(u["x"]) >= Roster.WORLD_WIDTH - 140.0
		if at_core:
			if float(u["cool"]) <= 0.0:
				u["action"] = "attack"
				u["action_ttl"] = 0.4
				cores[1 - team] -= maxf(3.0, float(stats["damage"]) - 5.0)
				u["cool"] = stats["rate"]
		else:
			u["action"] = "move"
			var direction := 1.0 if team == 0 else -1.0
			u["x"] = clampf(float(u["x"]) + direction * float(stats["speed"]) * dt, 130.0, Roster.WORLD_WIDTH - 130.0)

func _heal_ally(healer: Dictionary) -> void:
	if float(healer["cool"]) > 0.0:
		return
	var stats: Dictionary = healer["stats"]
	var chosen: Dictionary = {}
	var missing := 0.0
	for v in units:
		if int(v["team"]) != int(healer["team"]) or v["id"] == healer["id"]:
			continue
		var loss: float = float(v["max_hp"]) - float(v["hp"])
		if loss > missing and absf(float(v["x"]) - float(healer["x"])) <= float(stats["range"]):
			missing = loss
			chosen = v
	if not chosen.is_empty():
		chosen["hp"] = minf(float(chosen["max_hp"]), float(chosen["hp"]) + float(stats["heal"]))
		healer["cool"] = stats["rate"]
		healer["action"] = "skill"
		healer["action_ttl"] = 0.55
	else:
		healer["action"] = "move"
		var direction := 1.0 if int(healer["team"]) == 0 else -1.0
		healer["x"] = clampf(float(healer["x"]) + direction * float(stats["speed"]) * STEP * 0.3, 130.0, Roster.WORLD_WIDTH - 130.0)

func _damage(target: Dictionary, amount: float) -> void:
	target["hp"] -= maxf(3.0, amount - float(target["stats"]["armor"]) * 0.66)

func _run_towers(dt: float) -> void:
	for side in range(2):
		if towers[side] <= 0.0:
			continue
		tower_cool[side] = maxf(0.0, tower_cool[side] - dt)
		var x: float = 215.0 if side == 0 else Roster.WORLD_WIDTH - 215.0
		var target: Dictionary = {}
		var near := 285.0
		for u in units:
			if int(u["team"]) == side or float(u["hp"]) <= 0.0 or str(u["stats"]["kind"]) == "air":
				continue
			var dist: float = absf(float(u["x"]) - x)
			if dist < near:
				near = dist
				target = u
		if not target.is_empty() and tower_cool[side] <= 0.0:
			_damage(target, 27.0)
			tower_cool[side] = 0.34

func _remove_dead() -> void:
	var alive: Array[Dictionary] = []
	for u in units:
		if float(u["hp"]) > 0.0:
			alive.append(u)
		else:
			death_effects.append({
				"faction": int(u["faction"]), "role": int(u["role"]), "skin": u.get("skin","default"),
				"team": int(u["team"]), "x": float(u["x"]),
				"y": float(u["y"]), "time": 0.75
			})
	units = alive

func _age_deaths(dt: float) -> void:
	var active: Array[Dictionary] = []
	for effect in death_effects:
		effect["time"] = float(effect["time"]) - dt
		if float(effect["time"]) > 0.0:
			active.append(effect)
	death_effects = active

func _finish(side: int) -> void:
	ended = true
	winner = side
	message = "승리!" if side == 0 else ("패배" if side == 1 else "무승부")

func seconds_to_next_wave() -> int:
	return maxi(0, ceili(Roster.WAVE_PERIOD - _elapsed_wave))
