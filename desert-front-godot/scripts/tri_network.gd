extends Node
## Multi-peer NodeTunnel session for Desert Front classic/3lane PvP 1v1-3v3 and coop 2-3.
## The host alone simulates combat. No public client IP / inbound ports for relay rooms.
const Match = preload("res://scripts/tri_match.gd")
const Profile = preload("res://scripts/local_profile.gd")
const LAN_PORT := 28766
signal status_changed(text: String)
signal roster_changed(roster: Array, mode: String, size: int)
signal rooms_found(rooms: Array)
signal code_created(code: String)
signal match_started()
signal state_received(data: Dictionary)
signal left_room()

var mode := "idle" # idle, host, client, browse
var phase := "idle" # idle, lobby, playing
var match_mode := "pvp"
var match_ruleset := "standard"
var team_size := 1
var members: Dictionary = {}
var local_faction := 0
var local_skin := "default"
var local_name := "지휘관"
var local_tier := "브론즈"
var local_rating := 1000
var preferred_team := 1
var game
var _peer: MultiplayerPeer
var _pending := ""
var _room_code := ""
var _public := true
var _last_sync := 0.0
var _order_times: Dictionary = {}
var _relay_addr := ""
var _relay_app := ""
var _last_error := ""

func _ready() -> void:
	multiplayer.peer_connected.connect(_on_connected)
	multiplayer.peer_disconnected.connect(_on_disconnected)
	multiplayer.connected_to_server.connect(_on_joined)
	multiplayer.connection_failed.connect(_on_failed)
	multiplayer.server_disconnected.connect(_on_failed)

func _process(dt: float) -> void:
	if _peer != null and multiplayer.multiplayer_peer != _peer:
		_peer.poll()
	if mode == "host" and phase == "playing" and game != null:
		game.advance(minf(dt,0.20))
		_last_sync += dt
		var interval := 0.22 if game.units.size() < 120 else (0.33 if game.units.size() < 240 else 0.48)
		if _last_sync >= interval:
			_last_sync = 0.0
			_broadcast_state()

func leave() -> void:
	var previous := mode
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	if _peer != null:
		_peer.close()
	_peer = null
	mode = "idle"
	phase = "idle"
	members.clear()
	game = null
	_pending = ""
	_room_code = ""
	_order_times.clear()
	if previous != "idle":
		left_room.emit()

func _relay_credentials() -> bool:
	var cfg := ConfigFile.new()
	var path := OS.get_executable_path().get_base_dir().path_join("online_relay.cfg")
	var err: int = cfg.load(path) if FileAccess.file_exists(path) else cfg.load("res://online_relay.cfg")
	if err != OK:
		status_changed.emit("온라인 설정 파일을 읽지 못했습니다.")
		return false
	_relay_addr = str(cfg.get_value("relay","address","us-east.nodetunnel.io:8080")).strip_edges()
	_relay_app = str(cfg.get_value("relay","app_id","")).strip_edges()
	if _relay_app.is_empty() or not ClassDB.class_exists("NodeTunnelPeer"):
		status_changed.emit("온라인 릴레이 설정 또는 플러그인이 없습니다.")
		return false
	return true

func host_online(p_mode: String, p_size: int, faction: int, public: bool, skin: String = "default", p_ruleset: String = "standard") -> bool:
	if not _relay_credentials():
		return false
	if not _prepare_host(p_mode,p_size,faction,skin,p_ruleset):
		return false
	_public = public
	_pending = "host"
	_peer = ClassDB.instantiate("NodeTunnelPeer")
	_wire_relay()
	var err: int = _peer.call("connect_to_relay",_relay_addr,_relay_app)
	if err != OK:
		status_changed.emit("릴레이 접속 실패 %d" % err)
		leave()
		return false
	status_changed.emit("온라인 대기실 연결 중...")
	return true

func search_online() -> bool:
	if not _relay_credentials():
		return false
	leave()
	mode = "browse"
	phase = "lobby"
	_pending = "browse"
	_peer = ClassDB.instantiate("NodeTunnelPeer")
	_wire_relay()
	if _peer.call("connect_to_relay",_relay_addr,_relay_app) != OK:
		leave()
		return false
	status_changed.emit("공개방 검색 중...")
	return true

func join_online(code: String, faction: int, team: int, skin: String = "default") -> bool:
	var value := code.strip_edges()
	if value.is_empty() or value.length() > 128:
		status_changed.emit("방 코드가 올바르지 않습니다.")
		return false
	local_faction = clampi(faction,0,9)
	local_skin = skin if skin in ["default","moe","twilight","aurora","gold"] else "default"
	preferred_team = clampi(team,0,1)
	if mode == "browse" and _peer != null:
		mode = "client"
		_pending = "join"
		_room_code = value
		return _peer.call("join_room",value) == OK
	if not _relay_credentials():
		return false
	leave()
	mode = "client"
	phase = "lobby"
	_pending = "join"
	_room_code = value
	_peer = ClassDB.instantiate("NodeTunnelPeer")
	_wire_relay()
	if _peer.call("connect_to_relay",_relay_addr,_relay_app) != OK:
		leave()
		return false
	status_changed.emit("온라인 방 참가 중...")
	return true

func host_lan(p_mode: String,p_size: int,faction: int,skin: String = "default",p_ruleset: String = "standard") -> bool:
	if not _prepare_host(p_mode,p_size,faction,skin,p_ruleset):
		return false
	var enet := ENetMultiplayerPeer.new()
	if enet.create_server(LAN_PORT,5) != OK:
		leave()
		return false
	_peer = enet
	multiplayer.multiplayer_peer = _peer
	status_changed.emit("LAN 방 개설 (검증용)")
	_refresh_roster()
	return true

func join_lan(address: String,faction: int,team: int,skin: String = "default") -> bool:
	leave()
	local_faction = clampi(faction,0,9)
	local_skin = skin if skin in ["default","moe","twilight","aurora","gold"] else "default"
	preferred_team = clampi(team,0,1)
	mode = "client"
	phase = "lobby"
	var enet := ENetMultiplayerPeer.new()
	if enet.create_client(address if not address.strip_edges().is_empty() else "127.0.0.1",LAN_PORT) != OK:
		leave()
		return false
	_peer = enet
	multiplayer.multiplayer_peer = _peer
	return true

func _prepare_host(p_mode: String,p_size: int,faction: int,skin: String = "default",p_ruleset: String = "standard") -> bool:
	if p_mode not in ["classic","pvp","coop"]:
		return false
	if p_mode == "classic" and p_size != 1:
		return false
	if p_mode == "coop" and p_size < 2:
		return false
	if p_size < 1 or p_size > 3:
		return false
	leave()
	mode = "host"
	phase = "lobby"
	match_mode = p_mode
	match_ruleset = "augment" if p_ruleset == "augment" else "standard"
	team_size = p_size
	local_faction = clampi(faction,0,9)
	local_skin = skin if skin in ["default","moe","twilight","aurora","gold"] else "default"
	var profile := Profile.load_profile()
	local_name = str(profile["nickname"])
	local_tier = Profile.tier(int(profile["rating"]))
	local_rating = int(profile["rating"])
	members = {"1":{"uid":"1","id":1,"name":local_name,"team":0,"faction":local_faction,"skin":local_skin,"tier":local_tier,"rating":local_rating,"ready":true}}
	return true

func _wire_relay() -> void:
	_peer.authenticated.connect(_on_authenticated)
	_peer.room_connected.connect(_on_room_connected)
	_peer.rooms_received.connect(_on_rooms)
	_peer.error.connect(_on_relay_error)
	_peer.forced_disconnect.connect(_on_relay_closed)

func _on_authenticated() -> void:
	if _pending == "host":
		var data := "DF_NATIVE|%s|%d|%s" % [match_mode,team_size,match_ruleset]
		var err: int = _peer.call("host_room",_public,data)
		if err != OK:
			_on_relay_error("방 개설에 실패했습니다.")
	elif _pending == "browse":
		_peer.call("get_rooms")
	elif _pending == "join":
		_peer.call("join_room",_room_code)

func _on_room_connected() -> void:
	if _peer == null:
		return
	_room_code = str(_peer.get("room_id"))
	multiplayer.multiplayer_peer = _peer
	if mode == "host":
		code_created.emit(_room_code)
		status_changed.emit("방 생성 완료 · 초대 코드 %s" % _room_code)
		_refresh_roster()
	elif mode == "client":
		call_deferred("_hello_host")

func _on_rooms(data: Array) -> void:
	var filtered: Array = []
	for x in data:
		if not x is Dictionary:
			continue
		var metadata := str(x.get("metadata",""))
		var id := str(x.get("id",""))
		if metadata.begins_with("DF_NATIVE|") and not id.is_empty():
			filtered.append({"id":id,"label":metadata.replace("DF_NATIVE|","")})
	rooms_found.emit(filtered)
	status_changed.emit("공개방 %d개" % filtered.size())

func _on_relay_error(message: String) -> void:
	_last_error = message.left(180)
	status_changed.emit("릴레이 오류: "+_last_error)

func _on_relay_closed() -> void:
	leave()
	status_changed.emit("릴레이 연결이 종료되었습니다.")

func _on_connected(id: int) -> void:
	if mode == "host":
		status_changed.emit("참가자 연결됨: %d" % id)

func _on_disconnected(id: int) -> void:
	if mode == "host":
		members.erase(str(id))
		if phase == "playing":
			phase = "lobby"
			game = null
			status_changed.emit("참가자가 이탈하여 경기 중단")
		_refresh_roster()

func _on_joined() -> void:
	if mode == "client":
		_hello_host()

func _on_failed() -> void:
	leave()
	status_changed.emit("방장과 연결할 수 없습니다.")

func _hello_host() -> void:
	if mode == "client" and phase == "lobby":
		var profile := Profile.load_profile()
		client_hello.rpc_id(1,local_faction,preferred_team,local_skin,str(profile["nickname"]),Profile.tier(int(profile["rating"])),int(profile["rating"]))

@rpc("any_peer","call_remote","reliable")
func client_hello(faction: int,team: int,skin: String = "default",nickname: String = "지휘관",tier: String = "브론즈",rating: int = 1000) -> void:
	var sender := multiplayer.get_remote_sender_id()
	if mode != "host" or phase != "lobby" or faction < 0 or faction > 9 or sender <= 1 or skin not in ["default","moe","twilight","aurora","gold"]:
		return
	if members.has(str(sender)) or members.size() >= _expected_count():
		return
	var chosen := 0 if match_mode == "coop" else clampi(team,0,1)
	var occupied := 0
	for p in members.values():
		if int(p["team"]) == chosen:
			occupied += 1
	if occupied >= team_size and match_mode != "coop":
		chosen = 1 - chosen
		occupied = 0
		for p in members.values():
			if int(p["team"]) == chosen:
				occupied += 1
	if occupied >= team_size:
		feedback.rpc_id(sender,"선택한 팀 정원이 가득 찼습니다.")
		return
	var display_tier := tier if tier in ["브론즈","실버","골드","플래티넘","다이아몬드","마스터"] else "브론즈"
	members[str(sender)] = {"uid":str(sender),"id":sender,"name":Profile.sanitize_name(nickname),"team":chosen,"faction":faction,"skin":skin,"tier":display_tier,"rating":clampi(rating,100,3000),"ready":false}
	_refresh_roster()
	status_changed.emit("참가자 등록: %d / %d" % [members.size(),_expected_count()])

func _expected_count() -> int:
	return team_size if match_mode == "coop" else team_size*2

func _refresh_roster() -> void:
	if mode != "host":
		return
	var all: Array = members.values().duplicate(true)
	all.sort_custom(func(a: Dictionary,b: Dictionary)->bool:return int(a["id"])<int(b["id"]))
	roster_changed.emit(all,match_mode,team_size)
	for peer_id in members.keys():
		var id := int(peer_id)
		if id != 1:
			roster_update.rpc_id(id,all,match_mode,team_size,match_ruleset)

@rpc("authority","call_remote","reliable")
func roster_update(data: Array,p_mode: String,p_size: int,p_ruleset: String = "standard") -> void:
	if mode != "client" or phase != "lobby":
		return
	match_ruleset = p_ruleset
	match_mode = p_mode
	team_size = p_size
	members.clear()
	for p in data:
		members[str(p["uid"])] = p
	roster_changed.emit(data,match_mode,team_size)

func set_ready(ready: bool) -> void:
	if phase != "lobby":
		return
	if mode == "host":
		members["1"]["ready"] = ready
		_refresh_roster()
	elif mode == "client":
		client_ready.rpc_id(1,ready)

@rpc("any_peer","call_remote","reliable")
func client_ready(ready: bool) -> void:
	if mode != "host" or phase != "lobby":
		return
	var id := str(multiplayer.get_remote_sender_id())
	if not members.has(id):
		return
	members[id]["ready"] = ready
	_refresh_roster()

func can_start() -> bool:
	if mode != "host" or phase != "lobby" or members.size() != _expected_count():
		return false
	for p in members.values():
		if not bool(p["ready"]):
			return false
	if match_mode != "coop":
		for team in range(2):
			var count := 0
			for p in members.values():
				if int(p["team"]) == team:
					count += 1
			if count != team_size:
				return false
	return true

func start_match() -> bool:
	if not can_start():
		status_changed.emit("정원과 전원 준비 상태를 확인하세요.")
		return false
	var roster: Array = []
	for p in members.values():
		roster.append({"uid":p["uid"],"name":p["name"],"team":p["team"],"faction":p["faction"],"skin":p.get("skin","default"),"bot":false})
	roster.sort_custom(func(a: Dictionary,b: Dictionary)->bool:return str(a["uid"])<str(b["uid"]))
	game = Match.new(match_mode,team_size,roster,"hard" if match_mode == "coop" else "normal",match_ruleset,Time.get_ticks_msec())
	phase = "playing"
	for member in members.values():
		var id: int = member["id"]
		if id != 1:
			game_begin.rpc_id(id,match_mode,team_size,roster,match_ruleset)
	match_started.emit()
	_broadcast_state()
	return true

@rpc("authority","call_remote","reliable")
func game_begin(p_mode: String,p_size: int,data: Array,p_ruleset: String = "standard") -> void:
	if mode != "client" or phase != "lobby":
		return
	game = Match.new(p_mode,p_size,data,"hard" if p_mode == "coop" else "normal",p_ruleset)
	match_mode = p_mode
	team_size = p_size
	phase = "playing"
	match_started.emit()

func submit_order(command: Dictionary) -> void:
	if phase != "playing":
		return
	if mode == "host":
		var result: Dictionary = game.order("1",command)
		if not result.get("ok",false):
			status_changed.emit(str(result.get("reason","명령 오류")))
	elif mode == "client":
		client_order.rpc_id(1,command)

@rpc("any_peer","call_remote","reliable")
func client_order(command: Dictionary) -> void:
	if mode != "host" or phase != "playing" or game == null:
		return
	var sender := multiplayer.get_remote_sender_id()
	if not members.has(str(sender)):
		return
	if str(command.get("type","")) not in ["build","upgrade","tactic","augment_pick","augment_reroll"]:
		return
	# Limit untrusted client command floods; the host remains authoritative.
	var now := Time.get_ticks_msec()
	var last := int(_order_times.get(sender,0))
	if now - last < 30:
		return
	_order_times[sender] = now
	var result: Dictionary = game.order(str(sender),command)
	if not result.get("ok",false):
		feedback.rpc_id(sender,str(result.get("reason","명령 오류")))
	else:
		_broadcast_state()

@rpc("authority","call_remote","reliable")
func feedback(message: String) -> void:
	if mode == "client":
		status_changed.emit(message.left(160))

func _broadcast_state() -> void:
	if mode != "host" or game == null:
		return
	state_received.emit(game.snapshot("1"))
	for member in members.values():
		var id: int = member["id"]
		if id != 1:
			state_update.rpc_id(id,game.snapshot(str(id)))

@rpc("authority","call_remote","reliable")
func state_update(data: Dictionary) -> void:
	if mode != "client" or phase != "playing" or game == null:
		return
	if int(data.get("protocol",0)) != 2 or int(data.get("lanes",-1)) not in [1,3] or not data.get("units",null) is Array:
		return
	game.load_snapshot(data)
	state_received.emit(data)
