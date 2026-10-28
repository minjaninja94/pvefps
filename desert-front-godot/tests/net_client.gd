extends SceneTree
const Net = preload("res://scripts/network_session.gd")
const BattleSim = preload("res://scripts/battle_sim.gd")
var session
var sim
var verified := false

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	session = Net.new()
	session.name = "NetworkSession"
	root.add_child(session)
	session.match_begins.connect(_started)
	session.snapshot_received.connect(_snap)
	if not session.join_game("127.0.0.1", 5):
		quit(2)
		return
	await create_timer(1.5).timeout
	session.set_ready(true)
	await create_timer(4.0).timeout
	if not verified:
		push_error("LAN integration client did not receive authoritative state")
		quit(3)
		return
	print("LAN CLIENT OK: room ready, guest order, snapshot")
	quit(0)

func _started(f0: int, f1: int) -> void:
	sim = BattleSim.new(f0, f1)
	sim.versus_player = true
	session.bind_simulation(sim)
	session.submit_build(3, 1)

func _snap(data: Dictionary) -> void:
	if sim == null:
		return
	sim.load_snapshot(data)
	if sim.builds[1][3] == 1:
		verified = true
