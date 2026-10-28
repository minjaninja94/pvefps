extends SceneTree
const Match = preload("res://scripts/tri_match.gd")

var failures := 0
func check(ok: bool) -> void:
	if not ok:
		failures += 1
		push_error("Native Desert Front regression check failed; failures: %d" % failures)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var duel = Match.new("classic",1,[
		{"uid":"a","team":0,"faction":4},
		{"uid":"b","team":1,"faction":9}
	])
	check(duel.lanes == 1)
	check(duel.cores[0][0] == 7200.0)
	check(duel.order("a",{"type":"build","lane":0,"slot":0,"role":0})["ok"])
	check(not duel.order("a",{"type":"build","lane":1,"slot":0,"role":0})["ok"])
	check(duel.order("b",{"type":"build","lane":0,"slot":1,"role":8})["ok"]) # independent owner slots
	check(duel.order("b",{"type":"build","lane":0,"slot":0,"role":7})["ok"])
	duel.next_wave = 0.01
	duel.advance(0.05)
	check(duel.wave >= 1)
	check(duel.units.size() >= 2)
	check(duel.order("a",{"type":"upgrade","kind":"armor"})["ok"])
	check(not duel.order("a",{"type":"upgrade","kind":"bad"})["ok"])
	var snap: Dictionary = duel.snapshot("a")
	check(snap["players"][1]["cash"] < 0)
	var mirror = Match.new()
	mirror.load_snapshot(snap)
	check(mirror.wave == duel.wave)
	check(mirror.units.size() <= duel.units.size()) # fog conceals enemy units
	check(mirror.units.size() >= 1)
	var tri = Match.new("pvp",2,[
		{"uid":"host","team":0,"faction":0},
		{"uid":"teammate","team":0,"faction":5},
		{"uid":"visitor","team":1,"faction":6},
		{"uid":"visitor2","team":1,"faction":7}
	],"hard")
	check(tri.lanes == 3 and tri.size == 2)
	check(tri.cores[2][0] == 2500.0)
	check(tri.players.size() == 4)
	check(tri.order("host",{"type":"build","lane":2,"slot":10,"role":3})["ok"])
	check(tri.order("teammate",{"type":"build","lane":2,"slot":10,"role":3})["ok"])
	check(tri.order("visitor",{"type":"build","lane":0,"slot":10,"role":3})["ok"])
	check(not tri.order("nonexistent",{"type":"upgrade","kind":"weapon"})["ok"])
	tri.player_for("host")["cash"] += 300.0
	check(tri.order("host",{"type":"upgrade","kind":"weapon"})["ok"])
	check(not tri.order("host",{"type":"tactic","kind":"nuke","lane":0})["ok"])
	tri._hit_fort(1,0,1000.0,"forward")
	check(tri.forward_hp[1][0] == 0.0)
	check(tri.forward_claimed[1][0])
	check(tri.players[2]["cash"] == 230.0)
	check(tri.players[3]["cash"] == 435.0)
	check(tri.units.size() >= 1)
	check(tri.units.back()["guardian"])
	check(tri.units.back()["hero_count"] == 20)
	tri.units.back()["x"] = 2200.0
	tri._tick_units(0.05)
	check(tri.units.back()["x"] <= 1650.0)
	var coop = Match.new("coop",3,[
		{"uid":"u0","team":0,"faction":2},
		{"uid":"u1","team":0,"faction":3},
		{"uid":"u2","team":0,"faction":9}
	])
	check(coop.players.size() == 6)
	check(coop.players[3]["bot"])
	check(coop.order("u2",{"type":"build","lane":1,"slot":0,"role":7})["ok"])
	coop.next_wave = 0.01
	coop.advance(0.05)
	check(coop.wave >= 1)
	check(coop._count_builds(coop.players[3]) >= 1)
	print("DESERT FRONT TRI MATCH SMOKE OK: modes, teams, lane builds, guardian, coop AI, snapshot")
	quit(0 if failures == 0 else 1)
