extends SceneTree
const Match = preload("res://scripts/tri_match.gd")
const Rules = preload("res://scripts/augment_rules.gd")
var failures := 0
func check(ok: bool, label: String) -> void:
 if not ok:
  failures += 1
  push_error("Augment failure: " + label)
func _initialize() -> void:
 call_deferred("_run")
func _run() -> void:
 var rules = Rules.new(123)
 check(rules.cards.size()==300,"catalogue")
 var game = Match.new("classic",1,[{"uid":"a","team":0,"faction":0},{"uid":"b","team":1,"faction":1}],"normal","augment",123)
 check(game.augment_choice["round"]==1,"first round")
 var a: Dictionary = game.snapshot("a")["augment_choice"]
 var b: Dictionary = game.snapshot("b")["augment_choice"]
 check(a["tier"]==b["tier"],"shared tier")
 check(a["cards"].size()==3,"three cards")
 check(rules.by_id[a["cards"][0]]["scope"]=="faction-0","faction slot")
 check(rules.by_id[a["cards"][1]]["scope"]=="common","common slot")
 for slot in range(3):
  check(game.order("a",{"type":"augment_reroll","slot":slot})["ok"],"reroll")
  check(not game.order("a",{"type":"augment_reroll","slot":slot})["ok"],"second reroll")
 check(game.order("a",{"type":"augment_pick","slot":0})["ok"],"pick a")
 check(game.order("b",{"type":"augment_pick","slot":0})["ok"],"pick b")
 check(game.augment_choice.is_empty(),"choice cleared")
 var timeout = Match.new("classic",1,[{"uid":"a","team":0,"faction":0},{"uid":"b","team":1,"faction":1}],"normal","augment",7)
 for _i in range(151):
  timeout.advance(0.2)
 check(timeout.augment_choice.is_empty(),"timeout")
 check(timeout.seconds==0.0,"time freeze")
 for faction in range(10):
  var match_game = Match.new("classic",1,[{"uid":"a","team":0,"faction":faction},{"uid":"b","team":1,"faction":(faction+1)%10}],"normal","augment",123)
  for stage in Rules.STAGES:
   if stage > 1:
    match_game.wave = stage-1
    match_game.next_wave = 0.01
    match_game.advance(0.02)
   var offer_a: Dictionary = match_game.snapshot("a")["augment_choice"]
   var offer_b: Dictionary = match_game.snapshot("b")["augment_choice"]
   check(int(offer_a["round"])==stage,"stage")
   check(offer_a["tier"]==offer_b["tier"],"rarity parity")
   check(offer_a["cards"].size()==3,"card count")
   check(match_game.order("a",{"type":"augment_pick","slot":0})["ok"],"stage pick a")
   check(match_game.order("b",{"type":"augment_pick","slot":0})["ok"],"stage pick b")
  check(match_game.player_for("a")["augments"].size()==5,"five augments")
 print("AUGMENT_PARITY "+JSON.stringify({"schedule":game.augment_schedule,"offer":a["cards"]}))
 print("GODOT AUGMENT SMOKE ",failures)
 quit(0 if failures==0 else 1)

