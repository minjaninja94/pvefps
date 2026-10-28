extends SceneTree
## Run with: godot --headless --path desert-front-godot --script res://tests/smoke.gd
const Roster = preload("res://scripts/roster.gd")
const BattleSim = preload("res://scripts/battle_sim.gd")

func _initialize() -> void:
	call_deferred("_run_test")

func _run_test() -> void:
	print("DESERT FRONT CLASSIC SMOKE START")
	assert(Roster.FACTION_NAMES.size() == 10)
	assert(Roster.ROLE_NAMES.size() == 9)
	for faction in range(10):
		for role in range(8):
			var unit: Dictionary = Roster.definition(faction, role)
			assert(unit.size() > 0)
			assert(float(unit["hp"]) > 0.0)
			assert(float(unit["speed"]) > 0.0)
	assert(Roster.definition(3, 6)["kind"] == "ground")
	assert(Roster.definition(4, 6)["kind"] == "ground")
	assert(Roster.definition(6, 6)["kind"] == "ground")
	assert(Roster.definition(7, 6)["kind"] == "ground")
	assert(Roster.definition(9, 7)["heal"] > Roster.definition(0, 7)["heal"])
	print("ROSTER CHECKED; initializing classic adapter")
	var game = BattleSim.new(0, 1)
	assert(game.purchase(0, 0))
	assert(not game.purchase(0, 0))
	assert(game.purchase(1, 1))
	assert(game.purchase(0, -1))
	assert(game.builds[0][0] == -1)
	game.engine.next_wave = 0.01
	game.advance(0.05)
	assert(game.wave >= 1)
	assert(game.units.size() > 0)
	assert(game.cores[0] >= 0.0)
	assert(game.towers[0] == 1700.0)
	assert(game.forward_hp[0] == 1000.0)
	game.engine._hit_fort(0,0,1000.0,"forward")
	game.advance(0.05)
	assert(game.forward_hp[0] <= 0.0)
	var guardian_found := false
	for guardian_unit in game.engine.units:
		if bool(guardian_unit.get("guardian",false)):
			guardian_found = true
	assert(guardian_found)
	print("CLASSIC WAVE/GUARDIAN OK")
	var skins = BattleSim.new(2, 3, "moe", "default")
	skins._spawn(0, 0, 0)
	assert(skins.units[0]["skin"] == "moe")
	var copied_skins = BattleSim.new()
	copied_skins.load_snapshot(skins.snapshot())
	assert(copied_skins.units[0]["skin"] == "moe")
	var duel = BattleSim.new(2, 3)
	duel.versus_player = true
	assert(duel.purchase_for_team(1, 4, 1))
	assert(duel.builds[1][4] == 1)
	assert(not duel.purchase_for_team(1, 4, 2))
	assert(not duel.purchase_for_team(2, 4, 2))
	assert(duel.purchase_for_team(1, 4, -1))
	assert(duel.upgrade_for_team(0, "weapon"))
	assert(duel.upgrade_for_team(1, "armor"))
	assert(not duel.upgrade_for_team(1, "invalid"))
	var copied = BattleSim.new()
	copied.load_snapshot(duel.snapshot())
	assert(copied.builds[1][4] == -1)
	assert(copied.weapons[0] == 1)
	assert(copied.armor_levels[1] == 1)

	print("CLASSIC 1V1 SNAPSHOT CHECKS OK")
	var online_node := preload("res://scripts/network_session.gd").new()
	root.add_child(online_node)
	var cfg := ConfigFile.new()
	assert(cfg.load("res://online_relay.cfg") == OK)
	assert(str(cfg.get_value("relay","app_id","")).length() >= 12)
	# No network is opened in CI: real public relay connectivity requires external-network QA.
	online_node.leave()
	online_node.queue_free()
	print("Desert Front Godot data + single lane smoke OK")
	quit(0)
