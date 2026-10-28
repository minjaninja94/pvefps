extends RefCounted
## First-pass Godot data port from desert-strike/game-v2.js and tri-lane-engine.js.
## This file deliberately does not read or change the browser game.
const WORLD_WIDTH := 3300.0
const WORLD_HEIGHT := 520.0
const WAVE_PERIOD := 24.0
const CORE_HP := 7200.0
const TOWER_HP := 1250.0
const COST := [65, 95, 150, 205, 165, 245, 205, 145, 70]
const ROLE_NAMES := ["돌격", "사격", "대장갑", "장갑", "대공", "포격", "특수", "지원", "자원채취"]
## hp, damage, armor, range, cooldown, speed, can_attack_air, kind
const BASE := [
	[115.0, 21.0, 1.0, 29.0, 0.77, 82.0, false, "ground"],
	[108.0, 17.0, 1.0, 164.0, 0.80, 60.0, true, "ground"],
	[94.0, 47.0, 0.0, 208.0, 1.76, 49.0, true, "ground"],
	[390.0, 32.0, 9.0, 120.0, 1.27, 35.0, false, "ground"],
	[175.0, 16.0, 3.0, 228.0, 0.57, 47.0, true, "ground"],
	[114.0, 69.0, 0.0, 317.0, 2.55, 30.0, false, "ground"],
	[160.0, 24.0, 1.0, 149.0, 0.86, 92.0, true, "air"],
	[136.0, 0.0, 1.0, 139.0, 1.24, 61.0, false, "ground"]
]
const FACTION_NAMES := [
	"철갑연합", "심연군체", "성운결사", "해병성채", "월영 수인족",
	"은월 엘프족", "야월 퍼리족", "크롬 로보족", "옥토퍼 군체", "농농 페어리족"
]
const FACTION_COLORS := [
	"#79ddea", "#b9df8d", "#d6b8ff", "#dba77c", "#f0b4a6",
	"#b2e6cf", "#e8c392", "#83c5fd", "#c5a0fa", "#ffadd4"
]
## Faction multipliers (HP, damage, movement), preserved from current browser build.
const FACTION_MUTATORS := [
	[1.055, 1.00, 0.96], [0.995, 1.00, 1.12], [0.99, 1.09, 1.00],
	[1.09, 1.06, 1.01], [1.00, 1.00, 1.02], [0.94, 1.00, 0.99],
	[1.02, 1.00, 1.07], [1.07, 1.00, 0.99], [0.99, 1.00, 1.01],
	[0.84, 1.00, 1.01]
]
const UNIT_NAMES := [
	["진격 보병","기관총병","관통 로켓","철갑 전차","복합 대공포","궤도 자주포","추적 비행기","전장 구호병"],
	["송곳 발톱","산성 침벌","부식 포자충","거대 갑각수","가시 포자탑","폭식 투석충","비행 포식자","치유 공생충"],
	["수호 창병","광자 사수","균열 파괴자","수정 방패병","영점 수호기","공명 투창대","섬광 비행체","생명 융합사"],
	["무모칠 · 오도돌격","박철곤 · 중기관총","조조팔 · 대장갑포","황근출 · 배틀액스","톤톤정 · 대공 난사","마철두 · 포격특공","오도봉고 · 전우애 돌격","황룡 · 해병수육"],
	["백랑 검사","여우족 단검투척수","스라소니 창투사","맹호 방패기사","매의눈 사냥꾼","설표 돌도끼병","흑표 돌격기수","토끼족 치유사"],
	["달빛 검호","실바람 궁수","별무리 관통궁","고목 수호기사","별빛 대공궁","숲의 대마법사","초승달 비행마녀","샘물 치유사"],
	["늑대 추적자","여우총 사냥꾼","송곳니 분쇄자","곰 털갑옷 수호자","하울 창투사","들소 포격수","알파 늑대 기수","달빛 무리치유사"],
	["블레이드 오토마타","레이저 정찰기","레일 관통병기","티탄 실드 워커","플랙 대공드론","공성 캐논","전술 변형 메카","나노 정비유닛"],
	["팔완 돌격체","먹물 주술사","심해 관통술사","갑각 문어수호자","팔완 대공술사","심연 의식술사","마력 비행수","군체 사제"],
	["꽃잎 소검사","이슬 마도사","씨앗 관통술사","버섯껍질 방패수","반딧불 대공술사","꽃가루 폭격사","별빛 나비정령","꽃샘 치유사"]
]

static func definition(faction: int, role: int) -> Dictionary:
	if faction < 0 or faction >= 10 or role < 0 or role >= 8:
		return {}
	var b: Array = BASE[role]
	var m: Array = FACTION_MUTATORS[faction]
	var beast := faction == 4
	var elf := faction == 5
	var furry := faction == 6
	var robot := faction == 7
	var octo := faction == 8
	var fairy := faction == 9
	var bongo := faction == 3 and role == 6
	var prowler := beast and role == 6
	var wolf_rider := furry and role == 6
	var ground_special := role == 6 and faction in [3, 4, 6, 7]
	var melee := (beast or furry) and role in [0, 3, 6]
	var ranged := elf and role in [1, 2, 4, 5, 6]
	var hp_scale := 0.88 if elf and role == 0 else (1.05 if beast and role == 3 else 1.0)
	var dmg_scale := 1.0
	if beast:
		dmg_scale = 1.08 if melee else 0.83
	elif elf:
		dmg_scale = 1.045 if ranged else (0.84 if role == 0 else 1.0)
	elif furry:
		dmg_scale = 1.10 if melee else 0.93
	elif robot and role in [1, 2, 4, 5]:
		dmg_scale = 1.08
	elif octo and role in [2, 4, 5]:
		dmg_scale = 1.16
	var special_damage := 36.0 if bongo else (33.0 if prowler else (32.0 if wolf_rider else -1.0))
	return {
		"name": UNIT_NAMES[faction][role], "role": role, "faction": faction,
		"hp": 565.0 if bongo else float(b[0]) * 2.25 * float(m[0]) * hp_scale,
		"damage": special_damage if special_damage >= 0.0 else float(b[1]) * 0.94 * float(m[1]) * dmg_scale,
		"armor": 7.0 if bongo else (3.0 if prowler else (5.0 if ground_special and robot else float(b[2]))),
		"range": 43.0 if bongo else (40.0 if prowler else (42.0 if wolf_rider else float(b[3]) * (1.10 if ranged else (1.04 if robot and role in [1, 2, 4, 5] else 1.0)))),
		"rate": 1.45 if bongo else (0.95 if prowler else (0.9 if wolf_rider else float(b[4]))),
		"speed": 77.0 if bongo else (90.0 if prowler else float(b[5]) * float(m[2]) * 0.84 * (1.05 if melee else 1.0)),
		"air_target": (false if ground_special and not robot else bool(b[6])),
		"kind": "ground" if ground_special else str(b[7]),
		"heal": (36.0 if role == 7 else 0.0) * float(m[1]) * 1.5 * (0.85 if robot else (1.08 if fairy else 1.0)),
		"blast": (58.0 * (1.15 if octo else 1.0)) if role == 5 else 0.0
	}
