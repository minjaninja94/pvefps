extends SceneTree
const Icons = preload("res://scripts/ui_icons.gd")
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	assert(Icons.NAMES.size()==12)
	for i in range(12):
		var icon := Icons.get_icon(i)
		assert(icon != null)
		assert(icon.get_width()==24 and icon.get_height()==24)
		assert(icon.atlas.get_width()==288 and icon.atlas.get_height()==24)
	print("DESERT FRONT AI-GENERATED ICON ATLAS OK: 12 icons and bounds")
	quit(0)
