extends Node
## Authenticated Firebase REST bridge to the existing pvefps project.
## No SDK service account, admin credential or private keys on the client.
## Uploaded ratings are SELF-REPORTED, so they must NEVER determine cash/prizes.
signal connection_changed(online: bool, info: String)
const CFG := "res://firebase_public.cfg"
const SESSION := "user://desert_front_firebase_session.cfg"
const COLLECTION := "desertCommunityBoard"
var uid := ""
var id_token := ""
var refresh_token := ""
var busy := false
var last_error := ""

func _settings() -> Dictionary:
	var file := ConfigFile.new()
	if file.load(CFG) != OK:
		return {}
	var key := str(file.get_value("firebase","api_key",""))
	var project := str(file.get_value("firebase","project_id",""))
	if key.length() < 20 or project != "pvefps":
		return {}
	return {"key":key,"project":project}

func _http(url: String, method: int, body: String = "", authenticated: bool = false, form: bool = false) -> Dictionary:
	var req := HTTPRequest.new()
	req.timeout = 15.0
	add_child(req)
	var headers: PackedStringArray = []
	if method != HTTPClient.METHOD_GET:
		headers.append("Content-Type: application/x-www-form-urlencoded" if form else "Content-Type: application/json")
	if authenticated and not id_token.is_empty():
		headers.append("Authorization: Bearer " + id_token)
	var start := req.request(url, headers, method, body)
	if start != OK:
		req.queue_free()
		return {"ok":false,"error":"HTTP start error %d" % start}
	var response: Array = await req.request_completed
	req.queue_free()
	if response.size() < 4:
		return {"ok":false,"error":"Empty HTTP response"}
	var status := int(response[1])
	var parsed: Variant = JSON.parse_string((response[3] as PackedByteArray).get_string_from_utf8())
	if status < 200 or status >= 300:
		var msg := "HTTP %d" % status
		if parsed is Dictionary and parsed.get("error") is Dictionary:
			msg = str(parsed["error"].get("message",msg))
		return {"ok":false,"error":msg,"status":status}
	return {"ok":true,"value":parsed,"status":status}

func _remember() -> void:
	var file := ConfigFile.new()
	file.set_value("auth","uid",uid)
	file.set_value("auth","refresh_token",refresh_token)
	file.save(SESSION)

func _auth_response(data: Dictionary, refreshed: bool = false) -> bool:
	var token := str(data.get("id_token","")) if refreshed else str(data.get("idToken",""))
	var refresh := str(data.get("refresh_token","")) if refreshed else str(data.get("refreshToken",""))
	var user_id := str(data.get("user_id","")) if refreshed else str(data.get("localId",""))
	if token.is_empty() or refresh.is_empty() or user_id.is_empty():
		return false
	id_token = token
	refresh_token = refresh
	uid = user_id
	_remember()
	connection_changed.emit(true,"Firebase 익명 회원 연결 · UID 인증 성공")
	return true

func connect_member() -> bool:
	if busy:
		return false
	var settings := _settings()
	if settings.is_empty():
		last_error = "Firebase 공개 설정이 없습니다."
		return false
	busy = true
	var saved := ConfigFile.new()
	if saved.load(SESSION) == OK:
		var existing := str(saved.get_value("auth","refresh_token",""))
		if not existing.is_empty():
			var refresh_url := "https://securetoken.googleapis.com/v1/token?key=" + str(settings["key"])
			var encoded := "grant_type=refresh_token&refresh_token=" + existing.uri_encode()
			var renewed: Dictionary = await _http(refresh_url,HTTPClient.METHOD_POST,encoded,false,true)
			if bool(renewed.get("ok",false)) and renewed["value"] is Dictionary:
				if _auth_response(renewed["value"],true):
					busy = false
					return true
	var url := "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + str(settings["key"])
	var signed: Dictionary = await _http(url,HTTPClient.METHOD_POST,"{}")
	busy = false
	if bool(signed.get("ok",false)) and signed["value"] is Dictionary and _auth_response(signed["value"]):
		return true
	last_error = str(signed.get("error","Firebase 익명 로그인 실패"))
	connection_changed.emit(false,last_error)
	return false

static func encode_profile(uid_value: String, profile: Dictionary) -> Dictionary:
	return {"fields":{
		"nickname":{"stringValue":str(profile.get("nickname","지휘관")).left(16)},
		"rating":{"integerValue":str(clampi(int(profile.get("rating",1000)),100,3000))},
		"level":{"integerValue":str(clampi(int(profile.get("level",1)),1,100))},
		"pvpWins":{"integerValue":str(clampi(int(profile.get("pvp_wins",0)),0,1000000))},
		"pvpLosses":{"integerValue":str(clampi(int(profile.get("pvp_losses",0)),0,1000000))},
		"faction":{"integerValue":str(clampi(int(profile.get("preferred_faction",0)),0,9))},
		"verified":{"booleanValue":false},
		"owner":{"stringValue":uid_value}
	}}

static func decode_entry(document: Dictionary) -> Dictionary:
	var fields: Dictionary = document.get("fields",{})
	var name: String = str(document.get("name","")).get_file()
	if name.length() < 6 or fields.is_empty():
		return {}
	return {
		"uid":name,
		"nickname":str(fields.get("nickname",{}).get("stringValue","지휘관")),
		"rating":clampi(int(fields.get("rating",{}).get("integerValue","1000")),100,3000),
		"level":clampi(int(fields.get("level",{}).get("integerValue","1")),1,100),
		"wins":maxi(0,int(fields.get("pvpWins",{}).get("integerValue","0"))),
		"losses":maxi(0,int(fields.get("pvpLosses",{}).get("integerValue","0"))),
		"verified":bool(fields.get("verified",{}).get("booleanValue",false))
	}

func publish(profile: Dictionary) -> bool:
	if uid.is_empty() or id_token.is_empty():
		last_error = "먼저 Firebase 회원 연결을 해주세요."
		return false
	var settings := _settings()
	if settings.is_empty():
		return false
	var user_profile := profile.duplicate(true)
	user_profile["level"] = clampi(int(profile.get("level",1)),1,100)
	var doc := encode_profile(uid,user_profile)
	var url := "https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/%s/%s" % [settings["project"],COLLECTION,uid]
	var result: Dictionary = await _http(url,HTTPClient.METHOD_PATCH,JSON.stringify(doc),true)
	if bool(result.get("ok",false)):
		last_error = ""
		return true
	last_error = str(result.get("error","등록 실패"))
	return false

func leaderboard() -> Array:
	var settings := _settings()
	if settings.is_empty():
		last_error = "Firebase 공개 설정이 없습니다."
		return []
	var url := "https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents:runQuery" % settings["project"]
	var query := {"structuredQuery":{
		"from":[{"collectionId":COLLECTION}],
		"orderBy":[{"field":{"fieldPath":"rating"},"direction":"DESCENDING"}],
		"limit":50
	}}
	var response: Dictionary = await _http(url,HTTPClient.METHOD_POST,JSON.stringify(query),not id_token.is_empty())
	if not bool(response.get("ok",false)):
		last_error = str(response.get("error","순위 조회 실패"))
		return []
	var rows: Array = []
	if response["value"] is Array:
		for entry in response["value"]:
			if entry is Dictionary and entry.get("document") is Dictionary:
				var decoded := decode_entry(entry["document"])
				if not decoded.is_empty() and decoded["verified"] == false:
					rows.append(decoded)
	rows.sort_custom(func(a: Dictionary,b: Dictionary)->bool:
		return int(a["rating"]) > int(b["rating"])
	)
	last_error = ""
	return rows

static func display_board(rows: Array, mine: String = "") -> String:
	if rows.is_empty():
		return "등록된 비공식 순위가 없거나 Firebase 읽기 권한이 없습니다."
	var output: Array[String] = ["Desert Front · 커뮤니티 순위 (비공식)"]
	for i in range(mini(rows.size(),50)):
		var p: Dictionary = rows[i]
		var name := str(p.get("nickname","지휘관")).left(16)
		var indicator := " ◀ 나" if str(p.get("uid","")) == mine else ""
		output.append("%02d   %-16s  %4d RP  %d승 %d패%s" % [
			i+1,name,int(p.get("rating",1000)),int(p.get("wins",0)),int(p.get("losses",0)),indicator
		])
	output.append("\n순위·점수는 각 PC가 보고한 값으로 부정행위 검증되지 않았습니다.")
	output.append("상금/현금 보상/공식 시즌 티어에 사용하지 마세요.")
	return "\n".join(output)
