extends SceneTree
const Network = preload("res://scripts/tri_network.gd")
var net
var started := false
var chosen := false
var received := false
func _initialize() -> void:
 call_deferred("_run")
func _run() -> void:
 var args := OS.get_cmdline_user_args()
 var team := int(args[0]) if not args.is_empty() else 1
 net = Network.new()
 root.add_child(net)
 net.roster_changed.connect(_roster)
 net.match_started.connect(func()->void:started=true)
 net.state_received.connect(_state)
 if not net.join_lan("127.0.0.1",5,team):
  quit(2)
  return
 await create_timer(12.0).timeout
 if not started or not chosen or not received:
  push_error("Augment client did not resume state and choose")
  quit(3)
  return
 print("DESERT FRONT AUGMENT LAN GUEST OK: 2v2 choice")
 quit(0)
func _roster(_members: Array,_mode: String,_size: int) -> void:
 net.set_ready(true)
func _state(data: Dictionary) -> void:
 if not started:
  return
 received = true
 if chosen:
  return
 var offer: Dictionary = data.get("augment_choice",{})
 if offer.get("cards",[]).size()!=3:
  return
 chosen = true
 net.submit_order({"type":"augment_pick","slot":0})

