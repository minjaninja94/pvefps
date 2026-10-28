extends Control
## Native Godot UI and initial playable 1-line vertical slice.
const Roster = preload("res://scripts/roster.gd")
const BattleSim = preload("res://scripts/battle_sim.gd")
const BattleView = preload("res://scripts/battlefield.gd")
const Sprites = preload("res://scripts/sprite_assets.gd")
const NetworkSession = preload("res://scripts/network_session.gd")
const Records = preload("res://scripts/match_records.gd")
const Profile = preload("res://scripts/local_profile.gd")
const ProfileDialog = preload("res://scripts/profile_dialog.gd")
var simulation
var _network
var _address_input: LineEdit
var _online_room_input: LineEdit
var _online_room_list: OptionButton
var _online_room_code: Label
var _public_rooms: Array = []
var _net_status: Label
var _start_btn: Button
var _ready_btn: Button
var _view: Control
var _faction_picker: OptionButton
var _skin_picker: OptionButton
var _role_picker: OptionButton
var _banner_preview: TextureRect
var _unit_preview: TextureRect
var _preview_label: Label
var _info: Label
var _status: Label
var _grid: Array[Button] = []
var _weapon_btn: Button
var _armor_btn: Button
var _time_bank := 0.0
var _paused := false
var _speed := 1.0
var _ai_difficulty: OptionButton
var _pause_button: Button
var _speed_button: Button
var _ui_tick := 0.0
var _demolish := false
var _stored_match_result := false
var _history_dialog: AcceptDialog
var _profile_dialog: AcceptDialog

func _ready() -> void:
	_network = NetworkSession.new()
	_network.name = "NetworkSession"
	add_child(_network)
	_network.status_changed.connect(_on_network_status)
	_network.lobby_changed.connect(_on_lobby_changed)
	_network.match_begins.connect(_on_match_begins)
	_network.snapshot_received.connect(_on_network_snapshot)
	_network.session_closed.connect(_on_session_closed)
	_network.rooms_found.connect(_on_online_rooms_found)
	_network.room_code_available.connect(_on_online_room_code)
	_build_interface()
	_new_match()

func _process(dt: float) -> void:
	if simulation == null:
		return
	if _network.mode != "client" and (not _paused or _network.mode != "offline"):
		_time_bank += minf(dt * (_speed if _network.mode == "offline" else 1.0), 0.25)
		var cycles := 0
		while _time_bank >= BattleSim.STEP and cycles < 6:
			simulation.advance(BattleSim.STEP)
			_time_bank -= BattleSim.STEP
			cycles += 1
	if simulation.ended and not _stored_match_result:
		_stored_match_result = true
		var my_team := 1 if _network.mode == "client" else 0
		Records.record("classic",1,simulation.enemy_faction if my_team == 1 else simulation.player_faction,my_team,simulation.winner,simulation.wave,simulation.seconds)
		Profile.record_result("pvp" if simulation.versus_player else "classic",simulation.winner,my_team,simulation.versus_player,simulation.wave)
	_ui_tick += dt
	if _ui_tick >= 0.2:
		_ui_tick = 0.0
		_refresh()

func _build_interface() -> void:
	var background := ColorRect.new()
	background.color = Color("#0b141d")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)
	var shell := VBoxContainer.new()
	shell.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shell.offset_left = 16
	shell.offset_top = 14
	shell.offset_right = -16
	shell.offset_bottom = -12
	shell.add_theme_constant_override("separation", 12)
	add_child(shell)
	var header := HBoxContainer.new()
	shell.add_child(header)
	var title := Label.new()
	title.text = "DESERT FRONT   /   GODOT MIGRATION"
	title.add_theme_font_size_override("font_size", 26)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var faction_label := Label.new()
	faction_label.text = "아군 종족"
	header.add_child(faction_label)
	_faction_picker = OptionButton.new()
	_faction_picker.custom_minimum_size = Vector2(166, 40)
	for faction_name in Roster.FACTION_NAMES:
		_faction_picker.add_item(faction_name)
	header.add_child(_faction_picker)
	_skin_picker = OptionButton.new()
	_skin_picker.add_item("기본 도트")
	_skin_picker.add_item("모에화 스킨")
	_skin_picker.add_item("황혼 작전 (Lv.3)")
	_skin_picker.add_item("오로라 특무 (Lv.6)")
	_skin_picker.add_item("황금 근위 (Lv.10)")
	var account := Profile.load_profile()
	var account_level := Profile.level_from_xp(int(account["xp"]))
	for index in range(2,5):
		_skin_picker.set_item_disabled(index,not Profile.skin_unlocked(Profile.SKINS[index],account_level))
	_skin_picker.custom_minimum_size = Vector2(120,40)
	_skin_picker.item_selected.connect(func(_i: int) -> void: _update_art_preview())
	header.add_child(_skin_picker)
	var history_btn := Button.new()
	history_btn.text = "로컬 전적"
	history_btn.pressed.connect(_show_local_records)
	header.add_child(history_btn)
	var profile_btn := Button.new()
	profile_btn.text = "회원·티어"
	profile_btn.pressed.connect(_show_profile)
	header.add_child(profile_btn)
	var restart := Button.new()
	restart.text = "새 경기 시작"
	restart.custom_minimum_size = Vector2(115, 40)
	restart.pressed.connect(_new_match)
	header.add_child(restart)
	var multi := Button.new()
	multi.text = "3라인 · 2:2 · 3:3 · 협동"
	multi.pressed.connect(func() -> void: get_tree().change_scene_to_file("res://scenes/tri_front.tscn"))
	header.add_child(multi)
	var options := HBoxContainer.new()
	shell.add_child(options)
	_ai_difficulty = OptionButton.new()
	_ai_difficulty.add_item("AI 보통")
	_ai_difficulty.add_item("AI 하드")
	_ai_difficulty.custom_minimum_size = Vector2(116,36)
	options.add_child(_ai_difficulty)
	_pause_button = Button.new()
	_pause_button.text = "Ⅱ 일시정지"
	_pause_button.pressed.connect(_toggle_pause)
	options.add_child(_pause_button)
	_speed_button = Button.new()
	_speed_button.text = "▶ 1×"
	_speed_button.pressed.connect(_toggle_speed)
	options.add_child(_speed_button)
	var help_label := Label.new()
	help_label.text = "클래식: 1,700 HP 본진 포탑 · 전방 타워 · 가디언 · 종족 능력 · 영웅 합체"
	options.add_child(help_label)
	var online_bar := HBoxContainer.new()
	online_bar.add_theme_constant_override("separation", 8)
	shell.add_child(online_bar)
	var public_btn := Button.new()
	public_btn.text = "온라인 공개방 만들기"
	public_btn.pressed.connect(_host_public_online)
	online_bar.add_child(public_btn)
	var private_btn := Button.new()
	private_btn.text = "비공개방 만들기"
	private_btn.pressed.connect(_host_private_online)
	online_bar.add_child(private_btn)
	var browse_btn := Button.new()
	browse_btn.text = "공개방 검색"
	browse_btn.pressed.connect(_browse_online)
	online_bar.add_child(browse_btn)
	_online_room_list = OptionButton.new()
	_online_room_list.custom_minimum_size = Vector2(160, 36)
	_online_room_list.add_item("방 검색 후 선택")
	online_bar.add_child(_online_room_list)
	var public_join := Button.new()
	public_join.text = "선택 방 참가"
	public_join.pressed.connect(_join_selected_online)
	online_bar.add_child(public_join)
	_online_room_input = LineEdit.new()
	_online_room_input.custom_minimum_size = Vector2(145, 36)
	_online_room_input.placeholder_text = "초대 코드"
	online_bar.add_child(_online_room_input)
	var code_join := Button.new()
	code_join.text = "코드 참가"
	code_join.pressed.connect(_join_code_online)
	online_bar.add_child(code_join)
	_online_room_code = Label.new()
	_online_room_code.text = ""
	shell.add_child(_online_room_code)
	var network_bar := HBoxContainer.new()
	network_bar.add_theme_constant_override("separation", 8)
	shell.add_child(network_bar)
	var host_btn := Button.new()
	host_btn.text = "LAN 방 만들기"
	host_btn.pressed.connect(_host_game)
	network_bar.add_child(host_btn)
	_address_input = LineEdit.new()
	_address_input.custom_minimum_size = Vector2(165, 36)
	_address_input.placeholder_text = "호스트 IP (LAN)"
	_address_input.text = "127.0.0.1"
	network_bar.add_child(_address_input)
	var join_btn := Button.new()
	join_btn.text = "방 참가"
	join_btn.pressed.connect(_join_game)
	network_bar.add_child(join_btn)
	_ready_btn = Button.new()
	_ready_btn.text = "준비 완료"
	_ready_btn.disabled = true
	_ready_btn.pressed.connect(_toggle_ready)
	network_bar.add_child(_ready_btn)
	_start_btn = Button.new()
	_start_btn.text = "경기 시작"
	_start_btn.disabled = true
	_start_btn.pressed.connect(_start_network_match)
	network_bar.add_child(_start_btn)
	var leave_btn := Button.new()
	leave_btn.text = "로비 나가기"
	leave_btn.pressed.connect(_leave_lobby)
	network_bar.add_child(leave_btn)
	_net_status = Label.new()
	_net_status.text = "오프라인 싱글 | 공개방/초대 코드 접속은 온라인 릴레이 플러그인 필요"
	_net_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	shell.add_child(_net_status)
	var content := HBoxContainer.new()
	content.add_theme_constant_override("separation", 12)
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	shell.add_child(content)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(left)
	_info = Label.new()
	_info.add_theme_font_size_override("font_size", 16)
	left.add_child(_info)
	_view = BattleView.new()
	_view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_child(_view)
	_status = Label.new()
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	left.add_child(_status)
	var sidebar := VBoxContainer.new()
	sidebar.custom_minimum_size = Vector2(460, 0)
	sidebar.add_theme_constant_override("separation", 8)
	content.add_child(sidebar)
	var build_title := Label.new()
	build_title.text = "생산시설 건설 — 유닛 선택 후 빈 슬롯 클릭"
	build_title.add_theme_font_size_override("font_size", 17)
	sidebar.add_child(build_title)
	var preview_panel := PanelContainer.new()
	preview_panel.custom_minimum_size = Vector2(450, 118)
	sidebar.add_child(preview_panel)
	var preview_box := HBoxContainer.new()
	preview_box.add_theme_constant_override("separation", 10)
	preview_panel.add_child(preview_box)
	_banner_preview = TextureRect.new()
	_banner_preview.custom_minimum_size = Vector2(190, 108)
	_banner_preview.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_banner_preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_banner_preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_banner_preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	preview_box.add_child(_banner_preview)
	_unit_preview = TextureRect.new()
	_unit_preview.custom_minimum_size = Vector2(96, 96)
	_unit_preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_unit_preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_unit_preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	preview_box.add_child(_unit_preview)
	_preview_label = Label.new()
	_preview_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_preview_label.custom_minimum_size = Vector2(108, 50)
	_preview_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	preview_box.add_child(_preview_label)
	_faction_picker.item_selected.connect(func(_i: int) -> void: _update_art_preview())
	_role_picker = OptionButton.new()
	_role_picker.custom_minimum_size = Vector2(440, 42)
	for i in range(Roster.ROLE_NAMES.size()):
		_role_picker.add_item("%s · %d CR" % [Roster.ROLE_NAMES[i], Roster.COST[i]])
	sidebar.add_child(_role_picker)
	_role_picker.item_selected.connect(func(_i: int) -> void: _update_art_preview())
	var demolish := CheckButton.new()
	demolish.text = "철거 모드 (철거 시 비용 일부 환급)"
	demolish.toggled.connect(func(value: bool) -> void: _demolish = value)
	sidebar.add_child(demolish)
	var grid_bg := PanelContainer.new()
	grid_bg.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sidebar.add_child(grid_bg)
	var scroll := ScrollContainer.new()
	grid_bg.add_child(scroll)
	var slots := GridContainer.new()
	slots.columns = 15
	slots.add_theme_constant_override("h_separation", 1)
	slots.add_theme_constant_override("v_separation", 3)
	scroll.add_child(slots)
	for slot in range(BattleSim.SLOTS):
		var button := Button.new()
		button.custom_minimum_size = Vector2(29, 31)
		button.text = "·"
		button.tooltip_text = "생산 슬롯 %d" % (slot + 1)
		button.pressed.connect(_on_slot.bind(slot))
		slots.add_child(button)
		_grid.append(button)
	var upgrades := HBoxContainer.new()
	sidebar.add_child(upgrades)
	_weapon_btn = Button.new()
	_weapon_btn.text = "무기 강화"
	_weapon_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_weapon_btn.pressed.connect(_on_upgrade.bind("weapon"))
	upgrades.add_child(_weapon_btn)
	_armor_btn = Button.new()
	_armor_btn.text = "장갑 강화"
	_armor_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_armor_btn.pressed.connect(_on_upgrade.bind("armor"))
	upgrades.add_child(_armor_btn)
	var tactics := HBoxContainer.new()
	sidebar.add_child(tactics)
	for item in [{"name":"포탑 수리","key":"repair"},{"name":"궤도 폭격","key":"barrage"},{"name":"긴급 핵","key":"nuke"}]:
		var tactic_button := Button.new()
		tactic_button.text = item["name"]
		tactic_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tactic_button.pressed.connect(_on_tactic.bind(str(item["key"])))
		tactics.add_child(tactic_button)
	var note := Label.new()
	note.text = "기본 도트 / 모에화 스킨 선택 및 동기화\n3라인 · 1:1~3:3 · 협동전은 상단 버튼에서 시작\n전체 웹판 밸런스·효과·랭킹은 추가 이식 중"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sidebar.add_child(note)
	var footer := Label.new()
	footer.text = "Standalone Godot build  ·  original browser game untouched"
	shell.add_child(footer)
	_history_dialog = AcceptDialog.new()
	_history_dialog.title = "Desert Front · 이 PC 전적"
	add_child(_history_dialog)
	_profile_dialog = ProfileDialog.new()
	add_child(_profile_dialog)

func _show_profile() -> void:
	_profile_dialog.open_profile()

func _show_local_records() -> void:
	_history_dialog.dialog_text = Records.recent_text()
	_history_dialog.popup_centered(Vector2i(630,420))

func _selected_skin() -> String:
	if _skin_picker == null or _skin_picker.selected < 0 or _skin_picker.selected >= Profile.SKINS.size():
		return "default"
	var skin: String = Profile.SKINS[_skin_picker.selected]
	var level := Profile.level_from_xp(int(Profile.load_profile()["xp"]))
	return skin if Profile.skin_unlocked(skin,level) else "default"

func _update_art_preview() -> void:
	if _banner_preview == null or _unit_preview == null:
		return
	var faction := maxi(0, _faction_picker.selected)
	var role := maxi(0, _role_picker.selected)
	_banner_preview.texture = Sprites.skin_banner(faction, _selected_skin())
	_banner_preview.modulate = Sprites.palette_color(_selected_skin())
	_unit_preview.texture = Sprites.skin_portrait(faction, role, _selected_skin())
	_unit_preview.modulate = Sprites.palette_color(_selected_skin())
	if role < 8:
		_preview_label.text = "%s\n%s" % [
			Roster.FACTION_NAMES[faction], Roster.UNIT_NAMES[faction][role]
		]
	else:
		_preview_label.text = "%s\n자원채취 건물" % Roster.FACTION_NAMES[faction]

func _toggle_pause() -> void:
	if _network.mode != "offline":
		return
	_paused = not _paused
	_pause_button.text = "▶ 계속" if _paused else "Ⅱ 일시정지"

func _toggle_speed() -> void:
	if _network.mode != "offline":
		return
	_speed = 2.0 if _speed < 2.0 else (3.0 if _speed < 3.0 else 1.0)
	_speed_button.text = "▶ %d×" % int(_speed)

func _new_match() -> void:
	_paused = false
	_speed = 1.0
	_pause_button.text = "Ⅱ 일시정지"
	_speed_button.text = "▶ 1×"
	_stored_match_result = false
	_network.leave()
	if _online_room_code != null:
		_online_room_code.text = ""
	var faction: int = _faction_picker.selected
	simulation = BattleSim.new(faction, (faction + 1) % 10, _selected_skin())
	simulation.difficulty = "hard" if _ai_difficulty.selected == 1 else "normal"
	_view.simulation = simulation
	_time_bank = 0.0
	_faction_picker.disabled = false
	_net_status.text = "오프라인 싱글 | LAN 멀티: UDP 28765"
	_update_art_preview()
	_refresh()

func _host_public_online() -> void:
	if _network.host_online(_faction_picker.selected, true, _selected_skin()):
		_clear_match()
		_faction_picker.disabled = true

func _host_private_online() -> void:
	if _network.host_online(_faction_picker.selected, false, _selected_skin()):
		_clear_match()
		_faction_picker.disabled = true

func _browse_online() -> void:
	if _network.browse_online():
		_clear_match()
		_faction_picker.disabled = false
		_online_room_list.clear()
		_online_room_list.add_item("검색 중...")

func _join_selected_online() -> void:
	var index := _online_room_list.selected
	if index < 0 or index >= _public_rooms.size():
		_on_network_status("온라인 목록에서 참가할 방을 선택하세요.")
		return
	_join_online_room(str(_public_rooms[index]["id"]))

func _join_code_online() -> void:
	_join_online_room(_online_room_input.text)

func _join_online_room(code: String) -> void:
	if _network.join_online(code, _faction_picker.selected, _selected_skin()):
		_clear_match()
		_faction_picker.disabled = true

func _on_online_rooms_found(found: Array) -> void:
	_public_rooms = found
	_online_room_list.clear()
	if found.is_empty():
		_online_room_list.add_item("공개 방이 없습니다.")
	else:
		for info in found:
			_online_room_list.add_item(str(info["name"]))

func _on_online_room_code(code: String) -> void:
	_online_room_code.text = "온라인 방 코드: %s  (친구에게 이 코드만 전달)" % code

func _host_game() -> void:
	var selected: int = _faction_picker.selected
	if _network.host_game(selected, _selected_skin()):
		_clear_match()
		_faction_picker.disabled = true

func _join_game() -> void:
	var selected: int = _faction_picker.selected
	if _network.join_game(_address_input.text, selected, _selected_skin()):
		_clear_match()
		_faction_picker.disabled = true

func _toggle_ready() -> void:
	_network.set_ready(not _network.guest_ready)
	_ready_btn.text = "준비 취소" if _network.guest_ready else "준비 완료"

func _start_network_match() -> void:
	_network.start_match()

func _leave_lobby() -> void:
	_new_match()

func _clear_match() -> void:
	simulation = null
	_view.simulation = null
	_info.text = "접속 대기 중"
	_status.text = "온라인 방 준비 중입니다."
	_start_btn.disabled = true

func _on_network_status(text: String) -> void:
	if _net_status != null:
		_net_status.text = text

func _on_lobby_changed(can_start: bool, connected: bool) -> void:
	if _start_btn == null:
		return
	_start_btn.disabled = _network.mode != "host" or not can_start or _network.phase != "lobby"
	_ready_btn.disabled = _network.mode != "client" or not connected or _network.phase != "lobby"
	_ready_btn.text = "준비 취소" if _network.guest_ready else "준비 완료"

func _on_match_begins(f0: int, f1: int) -> void:
	_stored_match_result = false
	simulation = BattleSim.new(f0, f1, _network.host_skin, _network.guest_skin)
	simulation.versus_player = true
	_view.simulation = simulation
	_network.bind_simulation(simulation)
	_time_bank = 0.0
	_start_btn.disabled = true
	_ready_btn.disabled = true
	_refresh()

func _on_network_snapshot(data: Dictionary) -> void:
	if simulation != null and _network.mode == "client":
		simulation.load_snapshot(data)
		_refresh()

func _on_session_closed(_reason: String) -> void:
	_clear_match()
	_faction_picker.disabled = false

func _on_tactic(kind: String) -> void:
	if simulation == null:
		return
	if _network.mode == "offline":
		simulation.tactic(kind)
	else:
		_network.submit_tactic(kind)
	_refresh()

func _on_slot(slot: int) -> void:
	if simulation == null:
		return
	var role: int = -1 if _demolish else _role_picker.selected
	if _network.mode == "offline":
		simulation.purchase(slot, role)
	else:
		_network.submit_build(slot, role)
	_refresh()

func _on_upgrade(kind: String) -> void:
	if simulation == null:
		return
	if _network.mode == "offline":
		simulation.upgrade(kind)
	else:
		_network.submit_upgrade(kind)
	_refresh()

func _refresh() -> void:
	if simulation == null:
		return
	var side := 1 if _network.mode == "client" else 0
	var opponent := 1 - side
	_info.text = "WAVE %d / 22     다음 출격 %d초     크레딧 %d CR      아군 기지 %.0f HP     적 기지 %.0f HP" % [
		simulation.wave, simulation.seconds_to_next_wave(), int(simulation.cash[side]),
		maxf(simulation.cores[side], 0.0), maxf(simulation.cores[opponent], 0.0)
	]
	_status.text = "상태: %s" % simulation.message
	if simulation.ended and _network.mode != "offline":
		_status.text = "승리!" if simulation.winner == side else ("무승부" if simulation.winner < 0 else "패배")
	for slot in range(_grid.size()):
		var role: int = simulation.builds[side][slot]
		var button: Button = _grid[slot]
		button.text = "·" if role == -1 else str(role + 1)
		button.tooltip_text = "슬롯 %d — %s" % [slot + 1, "빈칸" if role == -1 else Roster.ROLE_NAMES[role]]
	var weapon_level: int = simulation.weapons[side]
	var armor_level: int = simulation.armor_levels[side]
	_weapon_btn.text = "무기 Lv.%d / 5" % weapon_level
	_armor_btn.text = "장갑 Lv.%d / 5" % armor_level
	_weapon_btn.disabled = simulation.ended or weapon_level >= 5
	_armor_btn.disabled = simulation.ended or armor_level >= 5
	_view.queue_redraw()
