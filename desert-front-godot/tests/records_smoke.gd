extends SceneTree
const Records = preload("res://scripts/match_records.gd")
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	var preview := Records.summarize([
		{"date":"2026-10-28","mode":"pvp","players":2,"faction":3,"result":"승리","wave":5,"seconds":331},
		{"date":"2026-10-27","mode":"coop","players":3,"faction":9,"result":"패배","wave":7,"seconds":1012}
	])
	assert(preview.contains("1승 1패 0무"))
	assert(preview.contains("PVP"))
	assert(preview.contains("COOP"))
	assert(Records.summarize([]).contains("기록된 경기 없음"))
	print("DESERT FRONT LOCAL RECORDS OK: summary, wins, losses, empty state")
	quit(0)
