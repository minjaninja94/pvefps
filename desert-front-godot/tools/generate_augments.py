#!/usr/bin/env python3
"""Produce the shared, reviewable Desert Front 300-card augment catalogue."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "desert-strike/assets/data/augments.json"
NAMES = ["돌격", "사격", "대장갑", "장갑", "대공", "포격", "특수", "지원"]
FACTIONS = ["철갑연합", "심연군체", "성운결사", "해병성채", "월영 수인족", "은월 엘프족", "야월 퍼리족", "크롬 로보족", "옥토퍼 군체", "농농 페어리족"]
TIERS = ("silver", "gold", "prismatic")
TIER_LABEL = {"silver": "실버", "gold": "골드", "prismatic": "프리즘"}
SCALE = {"silver": 1.0, "gold": 1.8, "prismatic": 2.8}
STAT_LABEL = {"hp":"최대 체력", "damage":"공격력", "armor":"장갑", "range":"사거리", "rate":"공격 간격", "speed":"이동 속도", "heal":"치유량", "blast":"폭발 범위", "regen":"초당 체력 회복", "crit":"추가 피해 확률"}
CARDS = []

def stat_card(scope, tier, slug, name, stat, roles, base, second=None):
    value = round(base * SCALE[tier], 4)
    effects = [{"kind":"stat", "stat":stat, "roles":roles, "value":value}]
    if second:
        effects.append({"kind":"stat", "stat":second[0], "roles":roles, "value":round(second[1] * SCALE[tier], 4)})
    subject = "전 병종" if not roles else "·".join(NAMES[r] for r in roles) + "병"
    display = f"{abs(value)*100:g}%" if stat != "armor" else f"{value:g}"
    description = f"{subject}의 {STAT_LABEL[stat]} {'감소' if value < 0 else '증가'} {display}" if stat != "armor" else f"{subject}의 장갑 +{display}"
    if second:
        description += f", {STAT_LABEL[second[0]]} 추가 강화"
    CARDS.append({"id":f"{scope}-{tier}-{slug}", "scope":scope, "tier":tier, "name":name, "description":description, "effects":effects})

def extra_card(scope, tier, slug, name, roles, count):
    CARDS.append({"id":f"{scope}-{tier}-{slug}", "scope":scope, "tier":tier, "name":name,
        "description":f"{NAMES[roles[0]]} 생산 시설에서 웨이브마다 병력 +{count}기. 병력 제한은 유지됩니다.",
        "effects":[{"kind":"extra_spawn", "roles":roles, "value":count}]})

# 50 shared choices: 18 silver, 18 gold, 14 prismatic.
ROLE_STATS = ["hp", "damage", "damage", "armor", "range", "blast", "speed", "heal"]
ROLE_BASE = [0.09, 0.09, 0.11, 1.0, 0.08, 0.11, 0.09, 0.11]
GLOBAL_STATS = [("hp",.05,"전열 재정비"),("damage",.05,"화력 교리"),("speed",.06,"기동 훈련"),("rate",-.045,"속사 교범"),("heal",.08,"응급 보급")]
for tier in TIERS:
    label = TIER_LABEL[tier]
    for role in range(8):
        stat_card("common", tier, f"role-{role}", f"{NAMES[role]} 전술 · {label}", ROLE_STATS[role], [role], ROLE_BASE[role])
    for index, (stat, value, name) in enumerate(GLOBAL_STATS):
        stat_card("common", tier, f"all-{index}", f"{name} · {label}", stat, [], value)
    if tier != "prismatic":
        extra_card("common", tier, "charge-pair", f"선봉 증원 · {label}", [0], 1)
        extra_card("common", tier, "rifle-pair", f"사선 확장 · {label}", [1], 1)
        stat_card("common", tier, "armor-focus", f"중장갑 집중 · {label}", "hp", [3], .07, ("armor",.4))
        stat_card("common", tier, "anti-air-focus", f"대공 사격망 · {label}", "damage", [4], .07, ("range",.035))
        stat_card("common", tier, "rear-line", f"후방 지원망 · {label}", "heal", [7], .08, ("speed",.035))
    else:
        extra_card("common", tier, "charge-pair", "선봉 증원 · 프리즘", [0], 2)

# Eight distinct role cards plus a faction-trait card at silver/gold,
# six role cards plus a trait card at prismatic: 25 per faction.
FACTION_ROLE_STATS = [
    ["hp","damage","range","armor","damage","blast","speed","heal"],
    ["speed","damage","blast","hp","range","blast","speed","heal"],
    ["hp","range","damage","armor","range","blast","speed","heal"],
    ["damage","damage","range","hp","damage","blast","hp","heal"],
    ["speed","damage","damage","hp","range","blast","speed","heal"],
    ["speed","range","range","armor","range","blast","speed","heal"],
    ["speed","damage","damage","hp","range","blast","speed","heal"],
    ["armor","damage","range","hp","damage","blast","hp","heal"],
    ["speed","damage","damage","armor","range","blast","speed","heal"],
    ["speed","damage","range","hp","range","blast","speed","heal"],
]
FACTION_TRAITS = [
    ("방벽 행군", "armor", [0,3], .55),
    ("군체 부화", "spawn", [0], 1),
    ("별빛 공명", "heal", [7], .075),
    ("전우애", "hp", [0,3,6], .055),
    ("달빛 추격", "speed", [0,6], .055),
    ("정밀 사격", "range", [1,2,4,5], .045),
    ("무리 사냥", "damage", [0,3,6], .055),
    ("전투 정비", "regen", [0,1,2,3,4,5,6,7], .00035),
    ("심해 재생", "regen", [0,1,2,3,4,5,6,7], .0004),
    ("꽃가루 연쇄", "heal", [7], .09),
]
for faction, faction_name in enumerate(FACTIONS):
    scope = f"faction-{faction}"
    for tier in TIERS:
        label = TIER_LABEL[tier]
        role_count = 6 if tier == "prismatic" else 8
        for role in range(role_count):
            stat = FACTION_ROLE_STATS[faction][role]
            base = .075 if stat not in ("armor","regen") else .7
            if stat == "armor":
                base = .55
            if stat == "blast":
                base = .09
            stat_card(scope, tier, f"role-{role}", f"{faction_name} {NAMES[role]} 개조 · {label}", stat, [role], base)
        trait_name, stat, roles, value = FACTION_TRAITS[faction]
        if stat == "spawn":
            extra_card(scope, tier, "trait", f"{faction_name} {trait_name} · {label}", roles, 1 if tier != "prismatic" else 2)
        else:
            stat_card(scope, tier, "trait", f"{faction_name} {trait_name} · {label}", stat, roles, value)

assert len(CARDS) == 300, len(CARDS)
assert len({c["id"] for c in CARDS}) == 300
assert [sum(c["scope"]=="common" and c["tier"]==t for c in CARDS) for t in TIERS] == [18,18,14]
for faction in range(10):
    assert [sum(c["scope"]==f"faction-{faction}" and c["tier"]==t for c in CARDS) for t in TIERS] == [9,9,7]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"schema":1,"cards":CARDS},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Wrote {len(CARDS)} augments to {OUT}")

WEB = ROOT / "desert-strike/augment-catalogue.js"
WEB.write_text("DesertAugments.load(" + json.dumps({"schema":1,"cards":CARDS},ensure_ascii=False,separators=(",",":")) + ");\n",encoding="utf-8")

GODOT = ROOT / "desert-front-godot/data/augments.json"
GODOT.parent.mkdir(parents=True,exist_ok=True)
GODOT.write_bytes(OUT.read_bytes())
