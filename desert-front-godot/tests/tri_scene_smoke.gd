extends SceneTree
## Headless loading of both native interfaces; the 3-lane scene includes lobby and network.
var failures := 0
func check(ok: bool) -> void:
	if not ok:
		failures += 1
		push_error("Native Desert Front regression check failed; failures: %d" % failures)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene := load("res://scenes/tri_front.tscn") as PackedScene
	check(scene != null)
	var node := scene.instantiate()
	check(node != null)
	root.add_child(node)
	await process_frame
	check(node.match_game != null)
	node._skins.select(1)
	node._practice()
	check(node.match_game.player_for("local")["skin"] == "moe")
	check(node.match_game.lanes == 3)
	check(node._view.simulation != null)
	check(node._grid.size() == 75)
	check(node.find_child("전장 · 생산",true,false) != null)
	check(node.find_child("강화 · 전술",true,false) != null)
	check(node._upgrade_details != null)
	node._modes.select(2)
	node._practice()
	check(node.match_game.lanes == 3 and node.match_game.size == 2)
	node._modes.select(4)
	node._practice()
	check(node.match_game.mode == "coop" and node.match_game.players.size() >= 4)
	node.queue_free()
	print("DESERT FRONT MULTIPLAYER UI OK: scene, 3lane roster, slot grid, co-op")
	quit(0 if failures == 0 else 1)
