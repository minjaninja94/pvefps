extends Node
## Steam-transport-ready 1v1 session over local ENet.
## Only the host runs BattleSim. The guest submits validated orders and receives snapshots.
signal status_changed(text: String)
signal lobby_changed(can_start: bool, connected: bool)
signal match_begins(faction0: int, faction1: int)
signal snapshot_received(data: Dictionary)
signal session_closed(reason: String)
signal rooms_found(rooms: Array)
signal room_code_available(room_code: String)

const PORT := 28765
var mode := "offline" # offline, host, client
var phase := "idle" # idle, lobby, playing
var faction := 0
var host_faction := 0
var guest_faction := 1
var guest_ready := false
var guest_id := 0
var _sim
var _snapshot_timer := 0.0
var _server: MultiplayerPeer
var _relay_peer: Object = null
var _relay_pending := ""
var _relay_public := true
var _relay_join_code := ""

func _ready() -> void:
	multiplayer.peer_connected.connect(_peer_connected)
	multiplayer.peer_disconnected.connect(_peer_disconnected)
	multiplayer.connected_to_server.connect(_connected_to_server)
	multiplayer.connection_failed.connect(_connection_failed)
	multiplayer.server_disconnected.connect(_server_disconnected)

func _process(dt: float) -> void:
	# Relay must be polled before assigning it to SceneTree multiplayer (room auth phase).
	if _relay_peer != null and multiplayer.multiplayer_peer != _relay_peer:
		_relay_peer.call("poll")
	if mode != "host" or phase != "playing" or guest_id == 0 or _sim == null:
		return
	_snapshot_timer += dt
	if _snapshot_timer >= 0.2:
		_snapshot_timer = 0.0
		_send_snapshot()

func host_game(selected_faction: int) -> bool:
	leave()
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(PORT, 1)
	if err != OK:
		status_changed.emit("호스트 시작 실패: UDP 포트 %d 사용 여부를 확인하세요." % PORT)
		return false
	mode = "host"
	phase = "lobby"
	faction = clampi(selected_faction, 0, 9)
	host_faction = faction
	guest_faction = (faction + 1) % 10
	_server = peer
	multiplayer.multiplayer_peer = peer
	status_changed.emit("방 개설: UDP %d · 참가자 연결 대기" % PORT)
	lobby_changed.emit(false, false)
	return true

func join_game(address: String, selected_faction: int) -> bool:
	leave()
	var ip := address.strip_edges()
	if ip.is_empty():
		ip = "127.0.0.1"
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(ip, PORT)
	if err != OK:
		status_changed.emit("연결 실패: 호스트 주소를 확인하세요.")
		return false
	mode = "client"
	phase = "lobby"
	faction = clampi(selected_faction, 0, 9)
	guest_faction = faction
	_server = peer
	multiplayer.multiplayer_peer = peer
	status_changed.emit("접속 시도: %s:%d" % [ip, PORT])
	return true

## Online transport via NodeTunnel (optional GDExtension), not Steam or public IP.
## Developer must register a relay app_id, install the signed plugin package and rebuild.
func _relay_settings() -> Dictionary:
	var config := ConfigFile.new()
	if config.load("res://online_relay.cfg") != OK:
		status_changed.emit("온라인 설정 파일이 없습니다.")
		return {}
	var app_id := str(config.get_value("relay", "app_id", "")).strip_edges()
	var address := str(config.get_value("relay", "address", "us-east.nodetunnel.io:8080")).strip_edges()
	if app_id.is_empty():
		status_changed.emit("온라인 릴레이 앱 ID가 설정되지 않았습니다. 개발자 등록이 필요합니다.")
		return {}
	if not ClassDB.class_exists("NodeTunnelPeer"):
		status_changed.emit("NodeTunnel 확장 기능이 없습니다. 온라인 빌드에 플러그인이 필요합니다.")
		return {}
	if address.is_empty():
		return {}
	return {"app_id": app_id, "address": address}

func _open_relay(intent: String, code: String, public: bool, chosen_faction: int) -> bool:
	var settings := _relay_settings()
	if settings.is_empty():
		return false
	leave()
	_relay_pending = intent
	_relay_join_code = code
	_relay_public = public
	faction = clampi(chosen_faction, 0, 9)
	host_faction = faction
	mode = "browse" if intent == "browse" else ("host" if intent == "host" else "client")
	phase = "lobby"
	_relay_peer = ClassDB.instantiate("NodeTunnelPeer")
	_relay_peer.authenticated.connect(_relay_authenticated)
	_relay_peer.room_connected.connect(_relay_room_connected)
	_relay_peer.rooms_received.connect(_relay_rooms_received)
	_relay_peer.error.connect(_relay_error)
	_relay_peer.forced_disconnect.connect(_relay_forced_disconnect)
	var err: int = _relay_peer.call("connect_to_relay", settings["address"], settings["app_id"])
	if err != OK:
		_relay_error("릴레이 서버에 연결할 수 없습니다. 오류 코드 %d" % err)
		return false
	status_changed.emit("온라인 릴레이 접속 중 (IP/포트 설정 불필요)")
	return true

func host_online(selected_faction: int, public: bool = true) -> bool:
	return _open_relay("host", "", public, selected_faction)

func browse_online() -> bool:
	return _open_relay("browse", "", true, 0)

func join_online(room_code: String, selected_faction: int) -> bool:
	var code := room_code.strip_edges()
	if code.is_empty() or code.length() > 128:
		status_changed.emit("유효한 방 코드를 입력하세요.")
		return false
	if mode == "browse" and _relay_peer != null:
		_relay_pending = "join"
		_relay_join_code = code
		mode = "client"
		faction = clampi(selected_faction, 0, 9)
		status_changed.emit("온라인 방 참가 중: %s" % code)
		return _relay_peer.call("join_room", code) == OK
	return _open_relay("join", code, false, selected_faction)

func _relay_authenticated() -> void:
	if _relay_peer == null:
		return
	if _relay_pending == "host":
		var metadata := "DESERT_FRONT_1V1|%s" % str(host_faction)
		var err: int = _relay_peer.call("host_room", _relay_public, metadata)
		if err != OK:
			_relay_error("온라인 방 생성 실패: %d" % err)
	elif _relay_pending == "join":
		var err: int = _relay_peer.call("join_room", _relay_join_code)
		if err != OK:
			_relay_error("온라인 방 참가 실패: %d" % err)
	elif _relay_pending == "browse":
		var err: int = _relay_peer.call("get_rooms")
		if err != OK:
			_relay_error("공개방 목록을 불러올 수 없습니다.")

func _relay_rooms_received(data: Array) -> void:
	var valid_rooms: Array = []
	for raw in data:
		if not raw is Dictionary:
			continue
		var metadata := str(raw.get("metadata", ""))
		var id := str(raw.get("id", ""))
		if metadata.begins_with("DESERT_FRONT_1V1|") and not id.is_empty():
			valid_rooms.append({"id": id, "name": "클래식 1:1 · %s" % id.left(10)})
	rooms_found.emit(valid_rooms)
	status_changed.emit("공개 방 %d개 검색됨" % valid_rooms.size())

func _relay_room_connected() -> void:
	if _relay_peer == null:
		return
	_server = _relay_peer as MultiplayerPeer
	multiplayer.multiplayer_peer = _server
	_relay_pending = ""
	var code := str(_relay_peer.get("room_id"))
	if mode == "host":
		guest_id = 0
		guest_ready = false
		status_changed.emit("온라인 공개방 생성 완료 · 코드: %s" % code)
		room_code_available.emit(code)
		lobby_changed.emit(false, false)
	elif mode == "client":
		status_changed.emit("온라인 방 입장 완료. 참가 등록 중...")
		lobby_changed.emit(false, true)
		call_deferred("_send_online_hello")

func _send_online_hello() -> void:
	if mode == "client" and phase == "lobby":
		remote_client_hello.rpc_id(1, faction)

func _relay_error(message: String) -> void:
	status_changed.emit("온라인 접속 오류: %s" % message.left(180))

func _relay_forced_disconnect() -> void:
	session_closed.emit("온라인 릴레이 연결 종료")
	leave()
	status_changed.emit("온라인 릴레이 연결이 종료되었습니다.")

func leave() -> void:
	if _server != null:
		_server.close()
		_server = null
	elif _relay_peer != null:
		_relay_peer.call("close")
	_relay_peer = null
	_relay_pending = ""
	_relay_join_code = ""
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	_sim = null
	guest_id = 0
	guest_ready = false
	mode = "offline"
	phase = "idle"
	_snapshot_timer = 0.0
	lobby_changed.emit(false, false)

func bind_simulation(sim) -> void:
	_sim = sim
	if mode == "host":
		_send_snapshot()

func _peer_connected(id: int) -> void:
	if mode == "host" and guest_id == 0:
		guest_id = id
		status_changed.emit("참가자가 연결되었습니다. 준비 완료를 기다립니다.")
		lobby_changed.emit(false, true)

func _peer_disconnected(id: int) -> void:
	if mode != "host" or id != guest_id:
		return
	guest_id = 0
	guest_ready = false
	_sim = null
	phase = "lobby"
	status_changed.emit("참가자가 이탈했습니다. 다른 참가자를 기다립니다.")
	session_closed.emit("참가자 연결 해제")
	lobby_changed.emit(false, false)

func _connected_to_server() -> void:
	if mode == "client":
		remote_client_hello.rpc_id(1, faction)
		status_changed.emit("연결 성공. 방장이 참가를 확인하는 중입니다.")
		lobby_changed.emit(false, true)

func _connection_failed() -> void:
	if mode == "client":
		leave()
		status_changed.emit("접속 실패: 방장 IP 또는 방화벽을 확인하세요.")

func _server_disconnected() -> void:
	if mode == "client":
		leave()
		session_closed.emit("방장 연결 종료")
		status_changed.emit("방장과 연결이 끊어졌습니다.")

@rpc("any_peer", "call_remote", "reliable")
func remote_client_hello(selected_faction: int) -> void:
	if mode != "host" or phase != "lobby":
		return
	if multiplayer.get_remote_sender_id() != guest_id or selected_faction < 0 or selected_faction >= 10:
		return
	guest_faction = selected_faction
	guest_ready = false
	remote_lobby.rpc_id(guest_id, host_faction, guest_faction, false)
	lobby_changed.emit(false, true)

@rpc("authority", "call_remote", "reliable")
func remote_lobby(f0: int, f1: int, ready: bool) -> void:
	if mode != "client" or phase != "lobby":
		return
	host_faction = clampi(f0, 0, 9)
	guest_faction = clampi(f1, 0, 9)
	guest_ready = ready
	status_changed.emit("방 참가 완료. 준비 완료를 선택하세요.")

func set_ready(ready: bool) -> void:
	if mode == "client" and phase == "lobby" and multiplayer.multiplayer_peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTED:
		remote_ready.rpc_id(1, ready)
		guest_ready = ready
		status_changed.emit("준비 완료" if ready else "준비 취소")

@rpc("any_peer", "call_remote", "reliable")
func remote_ready(ready: bool) -> void:
	if mode != "host" or phase != "lobby" or multiplayer.get_remote_sender_id() != guest_id:
		return
	guest_ready = ready
	lobby_changed.emit(ready, true)
	status_changed.emit("참가자 준비 완료. 경기 시작 가능" if ready else "참가자 준비 대기")

func start_match() -> bool:
	if mode != "host" or phase != "lobby" or guest_id == 0 or not guest_ready:
		status_changed.emit("참가자 연결 및 준비 완료가 필요합니다.")
		return false
	phase = "playing"
	remote_start.rpc_id(guest_id, host_faction, guest_faction)
	match_begins.emit(host_faction, guest_faction)
	status_changed.emit("1:1 대전 시작 — 방장 권한 전투 처리")
	return true

@rpc("authority", "call_remote", "reliable")
func remote_start(f0: int, f1: int) -> void:
	if mode != "client" or phase != "lobby":
		return
	phase = "playing"
	match_begins.emit(clampi(f0, 0, 9), clampi(f1, 0, 9))
	status_changed.emit("1:1 대전 진행 중")

func submit_build(slot: int, role: int) -> void:
	if phase != "playing" or _sim == null:
		return
	if mode == "host":
		_sim.purchase_for_team(0, slot, role)
		_send_snapshot()
	elif mode == "client":
		remote_build.rpc_id(1, slot, role)

func submit_upgrade(kind: String) -> void:
	if phase != "playing" or _sim == null:
		return
	if mode == "host":
		_sim.upgrade_for_team(0, kind)
		_send_snapshot()
	elif mode == "client":
		remote_upgrade.rpc_id(1, kind)

@rpc("any_peer", "call_remote", "reliable")
func remote_build(slot: int, role: int) -> void:
	if mode != "host" or phase != "playing" or _sim == null or multiplayer.get_remote_sender_id() != guest_id:
		return
	if not _sim.purchase_for_team(1, slot, role):
		remote_feedback.rpc_id(guest_id, str(_sim.message))
	_send_snapshot()

@rpc("any_peer", "call_remote", "reliable")
func remote_upgrade(kind: String) -> void:
	if mode != "host" or phase != "playing" or _sim == null or multiplayer.get_remote_sender_id() != guest_id:
		return
	if not _sim.upgrade_for_team(1, kind):
		remote_feedback.rpc_id(guest_id, str(_sim.message))
	_send_snapshot()

@rpc("authority", "call_remote", "reliable")
func remote_feedback(info: String) -> void:
	if mode == "client" and phase == "playing":
		status_changed.emit(info.left(120))

func _send_snapshot() -> void:
	if mode == "host" and phase == "playing" and _sim != null and guest_id != 0:
		remote_snapshot.rpc_id(guest_id, _sim.snapshot())

@rpc("authority", "call_remote", "reliable")
func remote_snapshot(data: Dictionary) -> void:
	if mode != "client" or phase != "playing":
		return
	if data.get("wave", -1) is not int or data.get("units", null) is not Array:
		return
	snapshot_received.emit(data)
