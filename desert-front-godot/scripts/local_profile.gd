extends RefCounted
## Local device profile and explicitly UNVERIFIED practice tier.
## A player can edit the file; never use rating to award money, prizes or global rank.
const PATH := "user://desert_front_profile_v1.json"
const SKINS := ["default","moe","twilight","aurora","gold"]
const SKIN_UNLOCK_LEVELS := [1,1,3,6,10]

static func skin_unlocked(skin: String, level: int) -> bool:
	var index := SKINS.find(skin)
	return index >= 0 and level >= int(SKIN_UNLOCK_LEVELS[index])
const MAX_NAME := 16
const LEVEL_CAP := 100

static func _new_profile() -> Dictionary:
	return {
		"version":1, "id":_make_id(), "nickname":"지휘관",
		"xp":0, "rating":1000, "solo_wins":0, "solo_losses":0,
		"coop_wins":0,"coop_losses":0, "pvp_wins":0,"pvp_losses":0,
		"preferred_skin":"default", "preferred_faction":0,
		"games":0
	}

static func _make_id() -> String:
	var rand_bytes := Crypto.new().generate_random_bytes(12)
	return rand_bytes.hex_encode()

static func sanitize_name(value: String) -> String:
	var cleaned := ""
	for i in range(value.length()):
		var c := value.substr(i,1)
		var code := value.unicode_at(i)
		if code < 32 or c in ["<",">","/","\\","{","}"]:
			continue
		cleaned += c
		if cleaned.length() >= MAX_NAME:
			break
	return cleaned.strip_edges() if not cleaned.strip_edges().is_empty() else "지휘관"

static func load_profile() -> Dictionary:
	var fresh := _new_profile()
	if not FileAccess.file_exists(PATH):
		return fresh
	var f := FileAccess.open(PATH,FileAccess.READ)
	if f == null:
		return fresh
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if not parsed is Dictionary or int(parsed.get("version",0)) != 1:
		return fresh
	if not str(parsed.get("id","")).is_valid_hex_number() or str(parsed.get("id","")).length() != 24:
		return fresh
	fresh["id"] = str(parsed["id"])
	fresh["nickname"] = sanitize_name(str(parsed.get("nickname","지휘관")))
	fresh["xp"] = clampi(int(parsed.get("xp",0)),0,10000000)
	fresh["rating"] = clampi(int(parsed.get("rating",1000)),100,3000)
	for key in ["solo_wins","solo_losses","coop_wins","coop_losses","pvp_wins","pvp_losses","games"]:
		fresh[key] = clampi(int(parsed.get(key,0)),0,1000000)
	var skin := str(parsed.get("preferred_skin","default"))
	fresh["preferred_skin"] = skin if skin in SKINS else "default"
	fresh["preferred_faction"] = clampi(int(parsed.get("preferred_faction",0)),0,9)
	return fresh

static func save_profile(profile: Dictionary) -> bool:
	var normalized := profile.duplicate(true)
	normalized["nickname"] = sanitize_name(str(normalized.get("nickname","지휘관")))
	var f := FileAccess.open(PATH,FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(normalized))
	f.flush()
	return f.get_error() == OK

static func rename(value: String) -> Dictionary:
	var player := load_profile()
	player["nickname"] = sanitize_name(value)
	save_profile(player)
	return player

static func tier(rating: int) -> String:
	if rating >= 2300:
		return "마스터"
	if rating >= 2000:
		return "다이아몬드"
	if rating >= 1700:
		return "플래티넘"
	if rating >= 1400:
		return "골드"
	if rating >= 1100:
		return "실버"
	return "브론즈"

static func level_from_xp(xp: int) -> int:
	var level := 1
	var remain := maxi(0,xp)
	while level < LEVEL_CAP and remain >= 100+level*70:
		remain -= 100+level*70
		level += 1
	return level

static func result(profile: Dictionary, mode: String, winner: int, my_team: int, verified_online: bool, wave: int) -> Dictionary:
	# verified_online represents a completed network PvP match in this client;
	# the rating remains UNVERIFIED because there is no trusted server.
	var next := profile.duplicate(true)
	var won := winner == my_team
	next["games"] = int(next.get("games",0))+1
	var key := ("pvp" if mode == "pvp" else ("coop" if mode == "coop" else "solo")) + ("_wins" if won else "_losses")
	next[key] = int(next.get(key,0))+1
	next["xp"] = mini(10000000,int(next.get("xp",0)) + (120 if won else 45) + mini(80,maxi(0,wave)*3))
	# Only networked human-versus-human matches adjust this machine's rating.
	# AI practice, 1v1 vs bots, and co-op cannot be used to farm tiers.
	if mode == "pvp" and verified_online and winner in [0,1]:
		var delta := 24 if won else -24
		next["rating"] = clampi(int(next.get("rating",1000))+delta,100,3000)
	return next

static func record_result(mode: String, winner: int, my_team: int, verified_online: bool, wave: int) -> bool:
	var next := result(load_profile(),mode,winner,my_team,verified_online,wave)
	return save_profile(next)

static func summary(profile: Dictionary) -> String:
	var rating := int(profile.get("rating",1000))
	return "%s  |  Lv.%d\n비공식 티어 %s · %d RP\n대전 %d승 / %d패 · 협동 %d승 / %d패 · 싱글 %d승 / %d패\n경험치 %d XP  · 총 %d경기\n\n이 프로필은 PC에만 보관되며 서버에서 인증하지 않습니다.\n다른 PC와 공식 순위로 합산하거나 현금 지급에 사용하지 않습니다." % [
		sanitize_name(str(profile.get("nickname","지휘관"))),
		level_from_xp(int(profile.get("xp",0))),tier(rating),rating,
		int(profile.get("pvp_wins",0)),int(profile.get("pvp_losses",0)),
		int(profile.get("coop_wins",0)),int(profile.get("coop_losses",0)),
		int(profile.get("solo_wins",0)),int(profile.get("solo_losses",0)),
		int(profile.get("xp",0)),int(profile.get("games",0))
	]
