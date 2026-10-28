extends AcceptDialog
## Shared lightweight profile editor. Local account is neither globally unique nor verified.
const Profile = preload("res://scripts/local_profile.gd")
var _name: LineEdit
var _info: Label

func _ready() -> void:
	title = "Desert Front · 회원 프로필 / 비공식 티어"
	exclusive = false
	var content := VBoxContainer.new()
	content.custom_minimum_size = Vector2(540,270)
	add_child(content)
	_info = Label.new()
	_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_info.custom_minimum_size.y = 155
	content.add_child(_info)
	var name_label := Label.new()
	name_label.text = "지휘관 닉네임 (최대 16자)"
	content.add_child(name_label)
	_name = LineEdit.new()
	_name.max_length = 16
	content.add_child(_name)
	var save_btn := Button.new()
	save_btn.text = "닉네임 저장"
	save_btn.pressed.connect(_save_name)
	content.add_child(save_btn)
	var warn := Label.new()
	warn.text = "현금화·전세계 순위는 별도 신뢰 가능한 검증 시스템이 필요합니다."
	warn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(warn)
	_refresh()

func open_profile() -> void:
	_refresh()
	popup_centered(Vector2i(620,340))

func _refresh() -> void:
	if _info == null or _name == null:
		return
	var data := Profile.load_profile()
	_info.text = Profile.summary(data)
	_name.text = str(data["nickname"])

func _save_name() -> void:
	Profile.rename(_name.text)
	_refresh()
