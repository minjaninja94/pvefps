extends SceneTree
const Match = preload("res://scripts/tri_match.gd")
func _initialize() -> void:
    call_deferred("_run")
func _run() -> void:
    var game = Match.new("pvp",1,[{"uid":"a","name":"A","team":0,"faction":0},{"uid":"b","name":"B","team":1,"faction":0}])
    game.order("a",{"type":"build","lane":0,"slot":0,"role":0})
    game.order("b",{"type":"build","lane":0,"slot":0,"role":0})
    var result := []
    for step in range(1001):
        if step in [0,20,480,600,1000]:
            var s: Dictionary = game.snapshot()
            var players := []
            for p in s["players"]:
                players.append(p["cash"])
            var units := []
            for u in s["units"]:
                units.append({"team":u["team"],"x":u["x"],"hp":u["hp"],"role":u["role"]})
            result.append({"step":step,"wave":s["wave"],"next":s["next_wave"],"cash":players,"cores":s["cores"],"turrets":s["turrets"],"forwardHP":s["forward_hp"],"units":units})
        if step < 1000:
            game.advance(0.05)
    print("PARITY_JSON="+JSON.stringify(result))
    quit(0)
