extends SceneTree
const Network = preload("res://scripts/tri_network.gd")
var net
var began := false
func _initialize() -> void:
 call_deferred("_run")
func _run() -> void:
 net = Network.new()
 root.add_child(net)
 net.roster_changed.connect(_roster)
 net.match_started.connect(_started)
 if not net.host_lan("pvp",2,0,"default","augment"):
  quit(2)
  return
 await create_timer(8.0).timeout
 if not began or net.game == null or not net.game.augment_choice.is_empty():
  push_error("Augment 2v2 choices did not complete")
  quit(3)
  return
 for p in net.game.players:
  if p["augments"].size()!=1:
   push_error("Augment missing for "+str(p["uid"]))
   quit(4)
   return
 print("DESERT FRONT AUGMENT LAN HOST OK: 2v2 shared tier, four choices")
 quit(0)
func _roster(_all: Array,_mode: String,_size: int) -> void:
 if net.can_start():
  net.start_match()
func _started() -> void:
 began = true
 net.submit_order({"type":"augment_pick","slot":0})

