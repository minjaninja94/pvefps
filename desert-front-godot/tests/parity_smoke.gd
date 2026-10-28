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
	enemy["ai_last_threat"] = "0:0:-1:0"
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
