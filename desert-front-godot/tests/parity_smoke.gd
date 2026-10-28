extends SceneTree
const Match = preload("res://scripts/tri_match.gd")
const Roster = preload("res://scripts/roster.gd")
const Sprites = preload("res://scripts/sprite_assets.gd")
var failures := 0

func check(ok: bool, description: String) -> void:
	if not ok:
		failures += 1
		push_error("Desert Front parity FAIL: " + description)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var game = Match.new("pvp",1,[
		{"uid":"a","team":0,"faction":4,"skin":"moe"},
		{"uid":"b","team":1,"faction":9,"skin":"default"}
	])
	game._spawn(game.player_for("a"),1,0,0)
	game._spawn(game.player_for("b"),1,1,7)
	check(game.units[0]["skin"] == "moe", "chosen skin attached to units")
	var original := Sprites.skin_atlas(4,0,"default")
	var illustrated := Sprites.skin_atlas(4,0,"moe")
	check(original != null and illustrated != null and original != illustrated,"default and moe artwork are independently available")
	check(Sprites.frame_region(4,6,3,"moe") == Rect2(288,576,96,96),"moe row is correctly selected")
	var snap: Dictionary = game.snapshot("a")
	check(snap["units"][0]["skin"] == "moe","network viewer receives correct skin")
	check(int(snap.get("protocol",0)) == 2,"multiplayer compact state protocol version")
	check(not snap["units"][0].has("stats"),"authoritative unit stats not redundantly sent over relay")
	check(float(snap["players"][1]["cash"]) == -1.0,"opponent economy redacted from network packets")
	var guardian = game.units[0]
	guardian["guardian"] = true
	guardian["hp"] = 1000.0
	guardian["max_hp"] = 2000.0
	guardian["last_damage"] = game.seconds
	check(is_equal_approx(game._guardian_heal(guardian,100.0),10.0),"recently hit guardian receives only 10% ally heal")
	guardian["last_damage"] = -999.0
	check(is_equal_approx(game._guardian_heal(guardian,100.0),25.0),"guardian ally heal is capped at 25%")
	var hero = Match.new("classic",1,[
		{"uid":"a","team":0,"faction":0},
		{"uid":"b","team":1,"faction":1,"bot":true}
	])
	for i in range(20):
		hero._spawn(hero.player_for("a"),0,i,0)
	hero._compact_heroes()
	check(hero.units.size() == 1 and int(hero.units[0]["hero_count"]) == 20,"20 identical soldiers combine into one hero")
	var enemy: Dictionary = hero.player_for("b")
	enemy["ai_opening"] = 3
	enemy["ai_target_role"] = 5
	enemy["ai_last_threat"] = "0:0:-1"
	enemy["cash"] = 200.0
	hero.units.clear()
	hero._ai_buy(enemy)
	check(int(enemy["cash"]) == 200,"AI banks for its committed siege unit instead of spamming cheap infantry")
	enemy["cash"] = 250.0
	hero._ai_buy(enemy)
	check(_count_role(enemy,5) == 1,"AI buys planned siege when sufficient credits arrive")
	check(Roster.definition(9,7)["heal"] > Roster.definition(0,7)["heal"],"fairy healing buff preserved")
	check(Roster.definition(4,6)["kind"] == "ground","beastkin cavalry does not fly")
	check(Roster.definition(3,6)["kind"] == "ground","marine bongo does not fly")
	check(Roster.definition(6,6)["kind"] == "ground","furry rider does not fly")
	check(Roster.definition(7,6)["kind"] == "ground","robot special is ground")
	# Special roles override default good/bad matchup tables.
	check(Roster.definition(3,6)["good"] == [0,7],"bongo crushes charge and healers")
	check(Roster.definition(4,6)["bad"] == [2,3],"beastkin cavalry weak against armor counters")
	check(Roster.definition(6,6)["good"] == [0,7],"furry cavalry faction special counters")
	check(Roster.definition(7,6)["bad"] == [2,5],"robot mech weak against breaker and siege")
	var ranged := Match.new("classic",1,[
		{"uid":"a","team":0,"faction":0},{"uid":"b","team":1,"faction":4}
	])
	ranged._spawn(ranged.player_for("a"),0,0,1)
	ranged._spawn(ranged.player_for("b"),0,0,0)
	var attacker: Dictionary = ranged.units[0]
	var defender: Dictionary = ranged.units[1]
	defender["hero_count"] = 20
	defender["hp"] = 5000.0
	defender["max_hp"] = 5000.0
	var health_before: float = defender["hp"]
	ranged._damage(defender, 100.0,attacker)
	var expected := maxf(3.0,100.0*1.55-float(defender["stats"]["armor"])/20.0*0.66)*0.94
	check(absf(health_before-float(defender["hp"])-expected)<0.01,"hero target preserves beastkin ranged mitigation")
	var at_capacity := Match.new("pvp",1,[
		{"uid":"a","team":0,"faction":0},{"uid":"b","team":1,"faction":1}
	])
	for i in range(at_capacity.MAX_GLOBAL_UNITS):
		at_capacity._spawn(at_capacity.player_for("a"),0,i%75,0)
	var last_regular_id: int = at_capacity.units.back()["id"]
	at_capacity.spawn_guardian(0,1)
	check(at_capacity.units.size()==at_capacity.MAX_GLOBAL_UNITS+1,"critical guardian spawn is not blocked by normal cap")
	check(int(at_capacity.units[at_capacity.MAX_GLOBAL_UNITS-1]["id"])==last_regular_id,"full population cannot mutate existing soldier")
	check(bool(at_capacity.units.back()["guardian"]),"new defensive guardian is spawned as separate unit")

	check(failures == 0,"all parity checks")
	print("DESERT FRONT PARITY: skins, guardians, hero fusion, hard AI purchase commitment, ground special units. Failures: %d" % failures)
	quit(0 if failures == 0 else 1)

func _count_role(p: Dictionary,role: int) -> int:
	var result := 0
	for row in p["buildings"]:
		for item in row:
			if int(item) == role:
				result += 1
	return result
