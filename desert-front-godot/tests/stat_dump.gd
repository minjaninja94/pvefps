extends SceneTree
const Roster = preload("res://scripts/roster.gd")
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	var entries: Array = []
	for faction in range(10):
		for role in range(8):
			var d: Dictionary = Roster.definition(faction,role)
			if d.is_empty():
				push_error("No unit definition for %d:%d" % [faction,role])
				quit(1)
				return
			entries.append({
				"f":faction,"r":role,
				"hp":d["hp"],"damage":d["damage"],"armor":d["armor"],
				"range":d["range"],"rate":d["rate"],"speed":d["speed"],
				"airTarget":d["air_target"],"kind":d["kind"],
				"heal":d["heal"],"blast":d["blast"],
				"good":d["good"],"bad":d["bad"]
			})
	print("DESERT_UNIT_PARITY_JSON="+JSON.stringify(entries))
	quit(0)
