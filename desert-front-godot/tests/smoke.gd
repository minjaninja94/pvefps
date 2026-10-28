extends SceneTree
## Run with: godot --headless --path desert-front-godot --script res://tests/smoke.gd
const Roster = preload("res://scripts/roster.gd")
const BattleSim = preload("res://scripts/battle_sim.gd")

func _initialize() -> void:
	call_deferred("_run_test")

func _run_test() -> void:
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
	var game = BattleSim.new(0, 1)
	assert(game.purchase(0, 0))
	assert(not game.purchase(0, 0))
	assert(game.purchase(1, 1))
	assert(game.purchase(0, -1))
	assert(game.builds[0][0] == -1)
	for i in range(490):
		game.advance(0.05)
	assert(game.wave >= 1)
	assert(game.units.size() > 0)
	assert(game.cores[0] >= 0.0)
	print("Desert Front Godot data + single lane smoke OK")
	quit(0)
