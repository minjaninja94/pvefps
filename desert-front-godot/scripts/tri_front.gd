extends Control
## Godot-native 3-lane/6-seat PvP and co-op room and battlefield interface.
const Roster = preload("res://scripts/roster.gd")
const Match = preload("res://scripts/tri_match.gd")
const Net = preload("res://scripts/tri_network.gd")
const TriView = preload("res://scripts/tri_view.gd")
var session
var match_game
var _offline := true
var _modes: OptionButton
var _factions: OptionButton
var _team_picker: OptionButton
var _room_input: LineEdit
var _room_picker: OptionButton
var _rooms: Array = []
var _status: Label
var _roster: Label
var _state: Label
var _role_picker: OptionButton
var _lane_picker: OptionButton
var _grid: Array[Button] = []
var _ready: Button
var _start: Button
var _view: Control
var _left_panel: VBoxContainer
var _time_bank := 0.0
var _hud_timer := 0.0
var _ready_flag := false
var _demolition := false
var _last_message := ""

func _ready() -> void:
	session = Net.new()
	session.name = "TriNetwork"
	add_child(session)
	session.status_changed.connect(_set_status)
	session.roster_changed.connect(_roster_changed)
	session.code_created.connect(_code_created)
	session.rooms_found.connect(_rooms_found)
	session.match_started.connect(_match_started)
	session.state_received.connect(_state_received)
	session.left_room.connect(_room_left)
	_build_ui()
	_practice()

func _process(dt: float) -> void:
	if match_game != null and _offline:
		_time_bank += minf(dt,0.25)
		var count := 0
		while _time_bank >= 0.05 and count < 5:
			match_game.advance(0.05)
			_time_bank -= 0.05
			count += 1
	_hud_timer += dt
	if _hud_timer > 0.25:
		_hud_timer = 0
		_refresh_ui()

func _build_ui() -> void:
	var background := ColorRect.new()
	background.color = Color("#0b141c")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)
	var shell := VBoxContainer.new()
	shell.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shell.offset_left = 13
	shell.offset_right = -13
	shell.offset_top = 11
	shell.offset_bottom = -11
	shell.add_theme_constant_override("separation",7)
	add_child(shell)
	var top := HBoxContainer.new()
	shell.add_child(top)
	var title := Label.new()
	title.text = "DESERT FRONT  |  전장 · 멀티"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size",22)
	top.add_child(title)
	var back := Button.new()
	back.text = "← 클래식 전장"
	back.pressed.connect(func()->void:get_tree().change_scene_to_file("res://scenes/main.tscn"))
	top.add_child(back)
	var toolbar := HBoxContainer.new()
	shell.add_child(toolbar)
	_modes = OptionButton.new()
	_modes.custom_minimum_size = Vector2(154,37)
	for caption in ["1:1 클래식","1:1 3라인","2:2 3라인","3:3 3라인","2인 협동","3인 협동"]:
		_modes.add_item(caption)
	_modes.select(1)
	toolbar.add_child(_modes)
	_factions = OptionButton.new()
	_factions.custom_minimum_size = Vector2(155,37)
	for name in Roster.FACTION_NAMES:
		_factions.add_item(name)
	toolbar.add_child(_factions)
	_team_picker = OptionButton.new()
	_team_picker.add_item("청팀")
	_team_picker.add_item("적팀")
	_team_picker.select(1)
	_team_picker.custom_minimum_size = Vector2(86,37)
	toolbar.add_child(_team_picker)
	var practice := Button.new()
	practice.text = "AI 연습 시작"
	practice.pressed.connect(_practice)
	toolbar.add_child(practice)
	var create := Button.new()
	create.text = "공개방 생성"
	create.pressed.connect(func()->void:_host_online(true))
	toolbar.add_child(create)
	var private := Button.new()
	private.text = "비공개방"
	private.pressed.connect(func()->void:_host_online(false))
	toolbar.add_child(private)
	var search := Button.new()
	search.text = "방 검색"
	search.pressed.connect(_search)
	toolbar.add_child(search)
	var room_row := HBoxContainer.new()
	shell.add_child(room_row)
	_room_picker = OptionButton.new()
	_room_picker.add_item("공개방 목록")
	_room_picker.custom_minimum_size = Vector2(210,35)
	room_row.add_child(_room_picker)
	var join_public := Button.new()
	join_public.text = "선택 방 참가"
	join_public.pressed.connect(_join_selected)
	room_row.add_child(join_public)
	_room_input = LineEdit.new()
	_room_input.placeholder_text = "초대 코드"
	_room_input.custom_minimum_size = Vector2(190,35)
	room_row.add_child(_room_input)
	var join_code := Button.new()
	join_code.text = "코드 참가"
	join_code.pressed.connect(func()->void:_join_code(_room_input.text))
	room_row.add_child(join_code)
	_ready = Button.new()
	_ready.text = "준비 완료"
	_ready.disabled = true
	_ready.pressed.connect(_toggle_ready)
	room_row.add_child(_ready)
	_start = Button.new()
	_start.text = "경기 시작"
	_start.disabled = true
	_start.pressed.connect(func()->void:session.start_match())
	room_row.add_child(_start)
	var leave := Button.new()
	leave.text = "방 나가기"
	leave.pressed.connect(_practice)
	room_row.add_child(leave)
	_status = Label.new()
	_status.text = "AI 연습 · 오프라인"
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	shell.add_child(_status)
	_roster = Label.new()
	_roster.text = "방 정보"
	_roster.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	shell.add_child(_roster)
	var content := HBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",9)
	shell.add_child(content)
	_left_panel = VBoxContainer.new()
	_left_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_left_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(_left_panel)
	_state = Label.new()
	_state.text = "전장 준비 중"
	_state.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_left_panel.add_child(_state)
	_view = TriView.new()
	_view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_view.lane_clicked.connect(_on_lane_clicked)
	_left_panel.add_child(_view)
	var side := VBoxContainer.new()
	side.custom_minimum_size = Vector2(435,0)
	content.add_child(side)
	var lane_label := Label.new()
	lane_label.text = "전장 위 클릭 또는 아래에서 생산 라인을 선택"
	side.add_child(lane_label)
	_lane_picker = OptionButton.new()
	for label in ["상단 라인", "중앙 라인", "하단 라인"]:
		_lane_picker.add_item(label)
	_lane_picker.select(1)
	_lane_picker.item_selected.connect(_on_lane_selected)
	side.add_child(_lane_picker)
	_role_picker = OptionButton.new()
	for i in range(Roster.ROLE_NAMES.size()):
		_role_picker.add_item("%s  ·  %d CR" % [Roster.ROLE_NAMES[i],Roster.COST[i]])
	side.add_child(_role_picker)
	var demolition := CheckButton.new()
	demolition.text = "철거 모드 (55% 환급)"
	demolition.toggled.connect(func(value: bool)->void:_demolition=value)
	side.add_child(demolition)
	var grid_scroll := ScrollContainer.new()
	grid_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	side.add_child(grid_scroll)
	var grid := GridContainer.new()
	grid.columns = 15
	grid.add_theme_constant_override("h_separation",1)
	grid.add_theme_constant_override("v_separation",2)
	grid_scroll.add_child(grid)
	for slot in range(Match.SLOTS):
		var cell := Button.new()
		cell.custom_minimum_size = Vector2(27,32)
		cell.text = "·"
		cell.pressed.connect(_build_slot.bind(slot))
		grid.add_child(cell)
		_grid.append(cell)
	var upgrades := HBoxContainer.new()
	side.add_child(upgrades)
	for spec in [{"label":"공격 강화","kind":"weapon"},{"label":"방어 강화","kind":"armor"}]:
		var button := Button.new()
		button.text = spec["label"]
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(_issue.bind({"type":"upgrade","kind":spec["kind"]}))
		upgrades.add_child(button)
	var tactics := HBoxContainer.new()
	side.add_child(tactics)
	for spec in [{"label":"포탑 수리","kind":"repair"},{"label":"궤도 폭격","kind":"barrage"},{"label":"긴급 핵","kind":"nuke"}]:
		var button := Button.new()
		button.text = spec["label"]
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(_tactic.bind(spec["kind"]))
		tactics.add_child(button)
	var note := Label.new()
	note.text = "원본 80종 유닛 도트 · 3라인 · 가디언 · 영웅 ×20\n실험적 릴레이 로비 · AI 연습 모드"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	side.add_child(note)

func _chosen() -> Dictionary:
	var index := maxi(0,_modes.selected)
	return [
		{"mode":"classic","size":1},
		{"mode":"pvp","size":1},
		{"mode":"pvp","size":2},
		{"mode":"pvp","size":3},
		{"mode":"coop","size":2},
		{"mode":"coop","size":3}
	][index]

func _practice() -> void:
	session.leave()
	_offline = true
	_ready.disabled = true
	_start.disabled = true
	_ready_flag = false
	var spec: Dictionary = _chosen()
	var roster: Array = [{"uid":"local","team":0,"faction":_factions.selected,"name":"나"}]
	if spec["mode"] != "classic":
		for i in range(1,int(spec["size"])):
			roster.append({"uid":"ally_ai_%d" % i,"team":0,"faction":(i+6)%10,"name":"연습 아군","bot":true})
	if spec["mode"] != "coop":
		for i in range(int(spec["size"])):
			roster.append({"uid":"enemy_ai_%d" % i,"team":1,"faction":(i+3)%10,"name":"연습 적군","bot":true})
	match_game = Match.new(spec["mode"],spec["size"],roster,"hard")
	_view.simulation = match_game
	_offline = true
	_time_bank = 0
	_set_status("AI 연습 시작 · 실제 다인전은 온라인 방 만들기/참가로 접속하세요.")
	_update_lane_options()
	_refresh_ui()

func _host_online(public: bool) -> void:
	var spec := _chosen()
	_offline = false
	match_game = null
	_view.simulation = null
	if session.host_online(str(spec["mode"]),int(spec["size"]),_factions.selected,public):
		_ready.disabled = false
		_start.disabled = true
		_ready_flag = true

func _search() -> void:
	if session.search_online():
		_offline = false
		_room_picker.clear()
		_room_picker.add_item("검색 중...")

func _rooms_found(found: Array) -> void:
	_rooms = found
	_room_picker.clear()
	if found.is_empty():
		_room_picker.add_item("대기 중인 공개방 없음")
	else:
		for room in found:
			_room_picker.add_item("%s · %s" % [str(room["label"]),str(room["id"]).left(10)])

func _join_selected() -> void:
	if _room_picker.selected < 0 or _room_picker.selected >= _rooms.size():
		_set_status("검색된 방을 선택하세요.")
		return
	_join_code(str(_rooms[_room_picker.selected]["id"]))

func _join_code(code: String) -> void:
	_offline = false
	match_game = null
	_view.simulation = null
	if session.join_online(code,_factions.selected,_team_picker.selected):
		_ready.disabled = false
		_ready_flag = false

func _roster_changed(members: Array, mode: String, size: int) -> void:
	var text_parts: Array[String] = []
	for p in members:
		text_parts.append("%s · %s · %s" % [
			str(p["name"]),
			"청팀" if int(p["team"]) == 0 else "적팀",
			"준비" if bool(p["ready"]) else "대기"
		])
	_roster.text = "%s %d명 / %d명: %s" % [
		mode,members.size(),size if mode == "coop" else size*2,
		"  |  ".join(text_parts)
	]
	_start.disabled = not session.can_start()

func _code_created(code: String) -> void:
	_room_input.text = code
	_set_status("초대 코드: %s · 친구에게 전달해 주세요." % code)

func _match_started() -> void:
	_offline = false
	match_game = session.game
	_view.simulation = match_game
	_ready.disabled = true
	_start.disabled = true
	_update_lane_options()
	_set_status("대전 시작 · 방장 권한 전투 판정 중")

func _state_received(_data: Dictionary) -> void:
	match_game = session.game
	_view.simulation = match_game
	_refresh_ui()

func _room_left() -> void:
	_ready.disabled = true
	_start.disabled = true
	_roster.text = "방에서 나왔습니다."

func _toggle_ready() -> void:
	_ready_flag = not _ready_flag
	session.set_ready(_ready_flag)
	_ready.text = "준비 취소" if _ready_flag else "준비 완료"

func _set_status(text: String) -> void:
	if _status != null:
		_status.text = text

func _on_lane_clicked(lane: int) -> void:
	if _lane_picker != null and lane < _lane_picker.item_count:
		_lane_picker.select(lane)
	_refresh_ui()

func _on_lane_selected(index: int) -> void:
	_view.selected_lane = index
	_view.queue_redraw()
	_refresh_ui()

func _update_lane_options() -> void:
	_lane_picker.clear()
	var n := match_game.lanes if match_game != null else 3
	for i in range(n):
		_lane_picker.add_item("라인 %d" % (i+1))
	_lane_picker.select(0 if n == 1 else 1)
	_view.selected_lane = _lane_picker.selected

func _local_uid() -> String:
	if _offline:
		return "local"
	if session.mode == "host":
		return "1"
	return str(multiplayer.get_unique_id())

func _issue(data: Dictionary) -> void:
	if match_game == null or match_game.ended:
		return
	var result: Dictionary = {}
	if _offline:
		result = match_game.order("local",data)
		if not result.get("ok",false):
			_set_status(str(result.get("reason","명령 실패")))
	else:
		session.submit_order(data)
	_refresh_ui()

func _build_slot(slot: int) -> void:
	_issue({"type":"build","lane":_lane_picker.selected,"slot":slot,"role":-1 if _demolition else _role_picker.selected})

func _tactic(kind: String) -> void:
	_issue({"type":"tactic","lane":_lane_picker.selected,"kind":kind})

func _refresh_ui() -> void:
	if match_game == null:
		_state.text = "온라인 대기실: 상대 플레이어를 기다리는 중"
		return
	var uid := _local_uid()
	var p: Dictionary = match_game.player_for(uid)
	if p.is_empty():
		return
	var team: int = p["team"]
	var lane := mini(maxi(0,_lane_picker.selected),match_game.lanes-1)
	var left := 0
	var right := 0
	for row in match_game.cores:
		left += int(row[0])
		right += int(row[1])
	_state.text = "%s  |  WAVE %d  |  다음 출격 %d초  |  내 자원 %d CR  |  아군 본진 HP %d / 적군 HP %d  |  무기 Lv.%d / 방어 Lv.%d" % [
		match_game.mode,match_game.wave,ceili(match_game.next_wave),
		int(p["cash"]),left if team==0 else right,right if team==0 else left,
		int(p["weapon"]),int(p["armor"])
	]
	for slot in range(_grid.size()):
		var role: int = p["buildings"][lane][slot]
		_grid[slot].text = "·" if role < 0 else str(role+1)
		_grid[slot].tooltip_text = "라인 %d / 슬롯 %d / %s" % [lane+1,slot+1,"비어 있음" if role<0 else Roster.ROLE_NAMES[role]]
	_view.queue_redraw()
