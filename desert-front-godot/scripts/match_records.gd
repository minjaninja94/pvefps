extends RefCounted
## Offline-only match history: NOT an online leaderboard.
## Stores no IP, remote account tokens, or personally identifiable opponent names.
const PATH := "user://desert_front_match_history.json"
const MAX_RECORDS := 40

static func history() -> Array:
	if not FileAccess.file_exists(PATH):
		return []
	var f := FileAccess.open(PATH, FileAccess.READ)
	if f == null:
		return []
	var raw := f.get_as_text()
	var parsed: Variant = JSON.parse_string(raw)
	if not parsed is Array:
		return []
	var valid: Array = []
	for item in parsed:
		if item is Dictionary and item.get("mode","") in ["classic","pvp","coop"]:
			valid.append(item)
			if valid.size() >= MAX_RECORDS:
				break
	return valid

static func record(mode: String, team_size: int, faction: int, my_team: int, winner: int, wave: int, duration: float) -> bool:
	if mode not in ["classic","pvp","coop"] or my_team not in [0,1]:
		return false
	var item := {
		"date":Time.get_datetime_string_from_system(false,true),
		"mode":mode,"players":clampi(team_size,1,3),
		"faction":clampi(faction,0,9),
		"result":"무승부" if winner == -1 else ("승리" if winner == my_team else "패배"),
		"wave":maxi(0,wave),
		"seconds":maxf(0.0,duration)
	}
	var entries := history()
	entries.push_front(item)
	entries.resize(mini(entries.size(),MAX_RECORDS))
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(entries))
	f.flush()
	return f.get_error() == OK

static func recent_text() -> String:
	return summarize(history())

static func summarize(data: Array) -> String:
	if data.is_empty():
		return "기록된 경기 없음\n\n게임 종료 시 결과가 이 PC에 자동 저장됩니다."
	var wins := 0
	var defeats := 0
	var draws := 0
	var lines: Array[String] = []
	for item in data:
		if not item is Dictionary:
			continue
		var outcome := str(item.get("result","무승부"))
		if outcome == "승리":
			wins += 1
		elif outcome == "패배":
			defeats += 1
		else:
			draws += 1
		if lines.size() < 12:
			var mode := str(item.get("mode","classic")).to_upper()
			var duration := roundi(float(item.get("seconds",0.0)))
			lines.append("%s  %s %d인 · W%d · %d:%02d · %s" % [
				str(item.get("date","")).left(16),mode,int(item.get("players",1)),
				int(item.get("wave",0)),int(duration/60),duration%60,outcome
			])
	var header := "최근 %d경기  ·  %d승 %d패 %d무\n이 PC에만 저장되는 개인 전적입니다.\n" % [wins+defeats+draws,wins,defeats,draws]
	return header + "\n".join(lines)
