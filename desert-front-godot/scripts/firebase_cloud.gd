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
var account_email := ""
var is_anonymous := true

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
	if refresh.is_empty() and not refreshed:
		refresh = refresh_token
	var user_id := str(data.get("user_id","")) if refreshed else str(data.get("localId",""))
	if token.is_empty() or refresh.is_empty() or user_id.is_empty():
		return false
	id_token = token
	refresh_token = refresh
	uid = user_id
	_remember()
	if not refreshed:
		account_email = str(data.get("email",""))
		is_anonymous = account_email.is_empty()
	connection_changed.emit(true,"Firebase 계정 연결 · UID 인증 성공")
	return true

func _load_account_info() -> void:
	if id_token.is_empty():
		return
	var settings := _settings()
	if settings.is_empty():
		return
	var url := "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + str(settings["key"])
	var result: Dictionary = await _http(url,HTTPClient.METHOD_POST,JSON.stringify({"idToken":id_token}))
	if bool(result.get("ok",false)) and result.get("value") is Dictionary:
		var users: Array = result["value"].get("users",[])
		if not users.is_empty() and users[0] is Dictionary:
			account_email = str(users[0].get("email",""))
			is_anonymous = account_email.is_empty()

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
					await _load_account_info()
					busy = false
					return true
	var url := "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + str(settings["key"])
	var signed: Dictionary = await _http(url,HTTPClient.METHOD_POST,JSON.stringify({"returnSecureToken":true}))
	if bool(signed.get("ok",false)) and signed["value"] is Dictionary and _auth_response(signed["value"]):
		await _load_account_info()
		busy = false
		last_error = ""
		return true
	busy = false
	last_error = str(signed.get("error","Firebase 익명 로그인 실패"))
	connection_changed.emit(false,last_error)
	return false


static func valid_email(email: String) -> bool:
	var cleaned := email.strip_edges()
	return cleaned.length() <= 254 and cleaned.find("@") > 0 and cleaned.get_slice("@",1).find(".") > 0 and not cleaned.contains(" ")

static func link_email_payload(token: String, email: String, password: String) -> Dictionary:
	return {"idToken":token,"email":email.strip_edges(),"password":password,"returnSecureToken":true}

func register_email(email: String, password: String) -> bool:
	last_error = ""
	if busy:
		last_error = "인증 요청 처리 중입니다."
		return false
	if not valid_email(email) or password.length() < 6:
		last_error = "올바른 이메일과 6자 이상의 비밀번호를 입력하세요."
		return false
	if uid.is_empty() or id_token.is_empty():
		if not await connect_member():
			return false
	if not account_email.is_empty():
		last_error = "이미 이메일이 연결된 계정입니다. 기존 이메일로 로그인하세요."
		return false
	var settings := _settings()
	if settings.is_empty():
		last_error = "Firebase 공개 설정이 없습니다."
		return false
	var previous_uid := uid
	busy = true
	var url := "https://identitytoolkit.googleapis.com/v1/accounts:update?key=" + str(settings["key"])
	var response: Dictionary = await _http(url,HTTPClient.METHOD_POST,JSON.stringify(link_email_payload(id_token,email,password)))
	busy = false
	if not bool(response.get("ok",false)) or not response.get("value") is Dictionary:
		last_error = str(response.get("error","계정 전환 실패"))
		return false
	if str(response["value"].get("localId","")) != previous_uid:
		last_error = "UID가 달라 기존 프로필을 보호하기 위해 전환을 중단했습니다."
		return false
	if not _auth_response(response["value"]):
		last_error = "Firebase 계정 갱신 응답이 올바르지 않습니다."
		return false
	account_email = email.strip_edges()
	is_anonymous = false
	last_error = ""
	connection_changed.emit(true,"이메일 계정 전환 완료 · 기존 UID 유지")
	return true

func login_email(email: String, password: String) -> bool:
	last_error = ""
	if busy:
		last_error = "인증 요청 처리 중입니다."
		return false
	if not valid_email(email) or password.is_empty():
		last_error = "이메일과 비밀번호를 확인하세요."
		return false
	var settings := _settings()
	if settings.is_empty():
		last_error = "Firebase 공개 설정이 없습니다."
		return false
	busy = true
	var url := "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + str(settings["key"])
	var response: Dictionary = await _http(url,HTTPClient.METHOD_POST,JSON.stringify({"email":email.strip_edges(),"password":password,"returnSecureToken":true}))
	busy = false
	if not bool(response.get("ok",false)) or not response.get("value") is Dictionary:
		last_error = str(response.get("error","이메일 로그인 실패"))
		return false
	if not _auth_response(response["value"]):
		last_error = "Firebase 로그인 응답이 올바르지 않습니다."
		return false
	account_email = email.strip_edges()
	is_anonymous = false
	last_error = ""
	connection_changed.emit(true,"이메일 계정 로그인 완료")
	return true

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
