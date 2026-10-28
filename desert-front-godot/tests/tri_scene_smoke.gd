extends SceneTree
## Headless loading of both native interfaces; the 3-lane scene includes lobby and network.
func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene := load("res://scenes/tri_front.tscn") as PackedScene
	assert(scene != null)
	var node := scene.instantiate()
	assert(node != null)
	root.add_child(node)
	await process_frame
	assert(node.match_game != null)
	assert(node.match_game.lanes == 3)
	assert(node._view.simulation != null)
	assert(node._grid.size() == 75)
	node._modes.select(2)
	node._practice()
	assert(node.match_game.lanes == 3 and node.match_game.size == 2)
	node._modes.select(4)
	node._practice()
	assert(node.match_game.mode == "coop" and node.match_game.players.size() >= 4)
	node.queue_free()
	print("DESERT FRONT MULTIPLAYER UI OK: scene, 3lane roster, slot grid, co-op")
	quit(0)
