extends RefCounted
## Shared augment catalogue; data generated from tools/generate_augments.py.
const STAGES := [1,10,20,30,40]
const TIERS := ["silver","gold","prismatic"]
const WEIGHTS := [[75,23,2],[55,38,7],[35,50,15],[20,55,25],[10,50,40]]
var cards: Array = []
var by_id: Dictionary = {}
var random_state := 1

func _init(seed: int = 1) -> void:
 random_state = seed & 0xffffffff
 if random_state == 0:
  random_state = 1
 var data: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/augments.json"))
 if data is Dictionary and data.get("schema",0) == 1:
  cards = data.get("cards",[])
  for card in cards:
   by_id[card["id"]] = card
 if cards.size() != 300:
  push_error("Augment catalogue must contain 300 cards")

func roll() -> float:
 random_state ^= (random_state << 13) & 0xffffffff
 random_state ^= random_state >> 17
 random_state ^= (random_state << 5) & 0xffffffff
 random_state &= 0xffffffff
 return float(random_state) / 4294967296.0

func roll_int(maximum: int) -> int:
 return floori(roll()*maximum)

func schedule(seed: int) -> Array:
 var state := random_state
 random_state = seed & 0xffffffff
 if random_state == 0:
  random_state = 1
 var result := []
 for weights in WEIGHTS:
  var n := roll() * 100.0
  result.append(TIERS[0 if n < weights[0] else (1 if n < weights[0]+weights[1] else 2)])
 random_state = state
 return result

func _draw(tier: String, scope: String, blocked: Dictionary) -> String:
 var pool := []
 for card in cards:
  if card["tier"] == tier and card["scope"] == scope and not blocked.has(card["id"]):
   pool.append(card)
 if pool.is_empty():
  return ""
 var id: String = pool[floori(roll()*pool.size())]["id"]
 blocked[id] = true
 return id

func offer(tier: String, faction: int, selected: Array) -> Array:
 var blocked := {}
 for id in selected:
  blocked[id] = true
 return [_draw(tier,"faction-%d" % faction,blocked),_draw(tier,"common",blocked),_draw(tier,"common",blocked)]

func reroll(tier: String, selected: Array, offered: Array, slot: int) -> String:
 if slot < 0 or slot > 2 or not by_id.has(offered[slot]):
  return ""
 var blocked := {}
 for id in selected + offered:
  blocked[id] = true
 return _draw(tier,str(by_id[offered[slot]]["scope"]),blocked)

func apply(stats: Dictionary, selected: Array, role: int) -> Dictionary:
 var out := stats.duplicate(true)
 for id in selected:
  if not by_id.has(id):
   continue
  for effect in by_id[id]["effects"]:
   if effect["kind"] != "stat" or not effect["roles"].is_empty() and not effect["roles"].has(role):
    continue
   var stat: String = effect["stat"]
   if not out.has(stat) and stat != "regen":
    continue
   var value: float = effect["value"]
   if stat == "regen":
    out[stat] = minf(0.005,float(out.get(stat,0.0))+value)
   elif stat == "armor":
    out[stat] = minf(50.0,float(out[stat])+value)
   elif stat == "rate":
    out[stat] = maxf(0.25,float(out[stat])*(1.0+value))
   else:
    out[stat] = maxf(0.0,float(out[stat])*(1.0+value))
 return out

func extra(selected: Array, role: int) -> int:
 var count := 0
 for id in selected:
  if not by_id.has(id):
   continue
  for effect in by_id[id]["effects"]:
   if effect["kind"] == "extra_spawn" and effect["roles"].has(role):
    count += int(effect["value"])
 return mini(3,count)

