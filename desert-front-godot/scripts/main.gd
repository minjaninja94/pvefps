extends Control
## Native Godot UI and initial playable 1-line vertical slice.
const Roster = preload("res://scripts/roster.gd")
const BattleSim = preload("res://scripts/battle_sim.gd")
const BattleView = preload("res://scripts/battlefield.gd")
var simulation
var _view: Control
var _faction_picker: OptionButton
var _role_picker: OptionButton
var _info: Label
var _status: Label
var _grid: Array[Button] = []
var _weapon_btn: Button
var _armor_btn: Button
var _time_bank := 0.0
var _ui_tick := 0.0
var _demolish := false

func _ready() -> void:
	_build_interface()
	_new_match()

func _process(dt: float) -> void:
	if simulation == null:
		return
	_time_bank += minf(dt, 0.25)
	var cycles := 0
	while _time_bank >= BattleSim.STEP and cycles < 6:
		simulation.advance(BattleSim.STEP)
		_time_bank -= BattleSim.STEP
		cycles += 1
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
	var restart := Button.new()
	restart.text = "새 경기 시작"
	restart.custom_minimum_size = Vector2(115, 40)
	restart.pressed.connect(_new_match)
	header.add_child(restart)
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
	_role_picker = OptionButton.new()
	_role_picker.custom_minimum_size = Vector2(440, 42)
	for i in range(Roster.ROLE_NAMES.size()):
		_role_picker.add_item("%s · %d CR" % [Roster.ROLE_NAMES[i], Roster.COST[i]])
	sidebar.add_child(_role_picker)
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
	var note := Label.new()
	note.text = "1차 이식: 기본 싱글 전투·건설·경제·AI\n스프라이트·종족 고유 패시브·3라인·스팀 온라인은 추후 이식"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sidebar.add_child(note)
	var footer := Label.new()
	footer.text = "Standalone Godot build  ·  original browser game untouched"
	shell.add_child(footer)

func _new_match() -> void:
	var faction: int = _faction_picker.selected
	simulation = BattleSim.new(faction, (faction + 1) % 10)
	_view.simulation = simulation
	_time_bank = 0.0
	_refresh()

func _on_slot(slot: int) -> void:
	var role: int = -1 if _demolish else _role_picker.selected
	simulation.purchase(slot, role)
	_refresh()

func _on_upgrade(kind: String) -> void:
	simulation.upgrade(kind)
	_refresh()

func _refresh() -> void:
	if simulation == null:
		return
	_info.text = "WAVE %d / 22     다음 출격 %d초     크레딧 %d CR      아군 기지 %.0f HP     적 기지 %.0f HP" % [
		simulation.wave, simulation.seconds_to_next_wave(), int(simulation.cash[0]),
		maxf(simulation.cores[0], 0.0), maxf(simulation.cores[1], 0.0)
	]
	_status.text = "상태: %s" % simulation.message
	for slot in range(_grid.size()):
		var role: int = simulation.builds[0][slot]
		var button: Button = _grid[slot]
		button.text = "·" if role == -1 else str(role + 1)
		button.tooltip_text = "슬롯 %d — %s" % [slot + 1, "빈칸" if role == -1 else Roster.ROLE_NAMES[role]]
	var weapon_level: int = simulation.weapons[0]
	var armor_level: int = simulation.armor_levels[0]
	_weapon_btn.text = "무기 Lv.%d / 5" % weapon_level
	_armor_btn.text = "장갑 Lv.%d / 5" % armor_level
	_weapon_btn.disabled = simulation.ended or weapon_level >= 5
	_armor_btn.disabled = simulation.ended or armor_level >= 5
	_view.queue_redraw()
