extends SceneTree
const Net = preload("res://scripts/network_session.gd")
const BattleSim = preload("res://scripts/battle_sim.gd")
var session
var sim

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	session = Net.new()
	session.name = "NetworkSession"
	root.add_child(session)
	session.lobby_changed.connect(_lobby)
	session.match_begins.connect(_started)
	if not session.host_game(0):
		quit(2)
		return
	await create_timer(8.0).timeout
	if sim == null or sim.builds[1][3] != 1:
		push_error("LAN integration host did not receive guest build")
		quit(3)
		return
	print("LAN HOST OK: authoritative guest build accepted")
	quit(0)

func _lobby(ready: bool, _connected: bool) -> void:
	if ready:
		session.start_match()

func _started(f0: int, f1: int) -> void:
	sim = BattleSim.new(f0, f1)
	sim.versus_player = true
	session.bind_simulation(sim)
