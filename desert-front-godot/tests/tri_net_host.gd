extends SceneTree
const Network = preload("res://scripts/tri_network.gd")
var net
var began := false
var validated := false

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	net = Network.new()
	net.name = "TriNetwork"
	root.add_child(net)
	net.roster_changed.connect(_roster)
	net.match_started.connect(func() -> void: began = true)
	if not net.host_lan("pvp",2,0):
		push_error("2v2 LAN host could not start")
		quit(2)
		return
	await create_timer(8.0).timeout
	if not began or net.game == null:
		push_error("2v2 LAN match did not begin")
		quit(3)
		return
	var built := 0
	for p in net.game.players:
		if p["uid"] != "1" and int(p["buildings"][1][1]) == 0:
			built += 1
	if built < 3:
		push_error("2v2 LAN host did not validate all guest orders: %d/3" % built)
		quit(4)
		return
	print("DESERT FRONT TRI NETWORK HOST OK: four human players, teams 2v2, 3 orders")
	quit(0)

func _roster(_all: Array,_mode: String,_size: int) -> void:
	if net.can_start():
		net.start_match()
