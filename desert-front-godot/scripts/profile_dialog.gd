extends AcceptDialog
## Shared lightweight profile editor. Local account is neither globally unique nor verified.
const Profile = preload("res://scripts/local_profile.gd")
const Cloud = preload("res://scripts/firebase_cloud.gd")
const Icons = preload("res://scripts/ui_icons.gd")
var _name: LineEdit
var _info: Label
var _cloud
var _cloud_status: Label
var _leaderboard_dialog: AcceptDialog
var _cloud_buttons: Array[Button] = []
var _email: LineEdit
var _password: LineEdit

func _ready() -> void:
	title = "Desert Front · 회원 프로필 / 비공식 티어"
	exclusive = false
	var content := VBoxContainer.new()
	content.custom_minimum_size = Vector2(620,520)
	add_child(content)
	_info = Label.new()
	_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_info.custom_minimum_size.y = 120
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
	_cloud = Cloud.new()
	add_child(_cloud)
	var cloud_title := Label.new()
	cloud_title.text = "Firebase pvefps · 온라인 커뮤니티 회원"
	content.add_child(cloud_title)
	var cloud_actions := HBoxContainer.new()
	content.add_child(cloud_actions)
	var buttons := [
		{"text":"온라인 회원 연결","method":"_connect_firebase","icon":9},
		{"text":"프로필 공개 등록","method":"_upload_profile","icon":8},
		{"text":"커뮤니티 랭킹","method":"_show_cloud_board","icon":1}
	]
	for choice in buttons:
		var button := Button.new()
		button.text = str(choice["text"])
		button.icon = Icons.get_icon(int(choice["icon"]))
		button.pressed.connect(Callable(self,str(choice["method"])))
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		cloud_actions.add_child(button)
		_cloud_buttons.append(button)
	var email_title := Label.new()
	email_title.text = "이메일 계정 · 기존 익명 UID 그대로 전환"
	content.add_child(email_title)
	_email = LineEdit.new()
	_email.placeholder_text = "이메일 주소"
	_email.max_length = 254
	content.add_child(_email)
	_password = LineEdit.new()
	_password.placeholder_text = "비밀번호 (6자 이상)"
	_password.secret = true
	_password.max_length = 128
	content.add_child(_password)
	var email_actions := HBoxContainer.new()
	content.add_child(email_actions)
	var signup_button := Button.new()
	signup_button.text = "이메일 계정 생성 / 전환"
	signup_button.pressed.connect(_register_email)
	email_actions.add_child(signup_button)
	_cloud_buttons.append(signup_button)
	var signin_button := Button.new()
	signin_button.text = "기존 이메일 계정 로그인"
	signin_button.pressed.connect(_login_email)
	email_actions.add_child(signin_button)
	_cloud_buttons.append(signin_button)
	_cloud_status = Label.new()
	_cloud_status.text = "연결되지 않음 · 온라인 랭킹은 비공식 자체신고 RP입니다."
	_cloud_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(_cloud_status)
	_leaderboard_dialog = AcceptDialog.new()
	_leaderboard_dialog.title = "Desert Front · 온라인 비공식 순위"
	add_child(_leaderboard_dialog)
	_refresh()

func _set_busy(value: bool) -> void:
	for button in _cloud_buttons:
		button.disabled = value

func _connect_firebase() -> void:
	_set_busy(true)
	_cloud_status.text = "기존 Firebase 프로젝트 인증 중..."
	var success: bool = await _cloud.connect_member()
	_cloud_status.text = "Firebase 회원 연결 완료" if success else "연결 실패: " + _cloud.last_error
	_set_busy(false)

func _register_email() -> void:
	_set_busy(true)
	_cloud_status.text = "익명 회원을 이메일 계정으로 전환 중..."
	var success: bool = await _cloud.register_email(_email.text,_password.text)
	_password.clear()
	_cloud_status.text = ("계정 생성 완료 · 동일한 Firebase UID 유지 · " + _cloud.account_email) if success else ("계정 생성 실패: " + _cloud.last_error)
	_set_busy(false)

func _login_email() -> void:
	_set_busy(true)
	_cloud_status.text = "기존 이메일 계정 로그인 중..."
	var success: bool = await _cloud.login_email(_email.text,_password.text)
	_password.clear()
	_cloud_status.text = ("이메일 로그인 완료 · " + _cloud.account_email) if success else ("로그인 실패: " + _cloud.last_error)
	_set_busy(false)

func _upload_profile() -> void:
	_set_busy(true)
	if _cloud.uid.is_empty():
		if not await _cloud.connect_member():
			_cloud_status.text = "인증 실패: " + _cloud.last_error
			_set_busy(false)
			return
	var local := Profile.load_profile()
	local["level"] = Profile.level_from_xp(int(local["xp"]))
	var published: bool = await _cloud.publish(local)
	_cloud_status.text = "비공식 순위 등록 완료" if published else "등록 실패: " + _cloud.last_error + " · firestore.rules 게시 여부 확인"
	_set_busy(false)

func _show_cloud_board() -> void:
	_set_busy(true)
	_cloud_status.text = "Firestore 커뮤니티 순위 조회 중..."
	var entries: Array = await _cloud.leaderboard()
	_leaderboard_dialog.dialog_text = Cloud.display_board(entries,_cloud.uid)
	_leaderboard_dialog.popup_centered(Vector2i(750,520))
	_cloud_status.text = "조회 완료 · 자기신고 랭킹" if _cloud.last_error.is_empty() else "조회 실패: " + _cloud.last_error
	_set_busy(false)

func open_profile() -> void:
	_refresh()
	popup_centered(Vector2i(750,650))

func _refresh() -> void:
	if _info == null or _name == null:
		return
	var data := Profile.load_profile()
	_info.text = Profile.summary(data)
	_name.text = str(data["nickname"])

func _save_name() -> void:
	Profile.rename(_name.text)
	_refresh()
