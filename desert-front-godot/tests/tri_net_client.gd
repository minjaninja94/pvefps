extends SceneTree
const Network = preload("res://scripts/tri_network.gd")
var net
var received := false
var started := false
var requested := false

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var args := OS.get_cmdline_user_args()
	var preferred := int(args[0]) if not args.is_empty() else 1
	net = Network.new()
	net.name = "TriNetwork"
	root.add_child(net)
	net.roster_changed.connect(_roster)
	net.match_started.connect(_started)
	net.state_received.connect(_state)
	if not net.join_lan("127.0.0.1",5,preferred):
		push_error("2v2 client could not connect")
		quit(2)
		return
	await create_timer(12.0).timeout
	if not started or not received:
		push_error("2v2 client did not receive match + authoritative state")
		quit(3)
		return
	print("DESERT FRONT TRI NETWORK GUEST OK: 2v2 room, ready and snapshot")
	quit(0)

func _roster(_members: Array,_mode: String,_size: int) -> void:
	if not requested:
		requested = true
		net.set_ready(true)

func _started() -> void:
	started = true
	net.submit_order({"type":"build","lane":1,"slot":1,"role":0})

func _state(_data: Dictionary) -> void:
	if started:
		received = true
