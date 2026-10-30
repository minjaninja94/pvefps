#!/usr/bin/env python3
"""Render eighty Japanese VOICEVOX Nemo specialist lines as per-faction OGG atlases.
Requires a running official VOICEVOX Nemo engine at http://127.0.0.1:50121.
Updates the existing voice_index.json; does not replace original voice clips.
"""
import json
import subprocess
import tempfile
import urllib.parse
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "assets" / "audio"
BASE = "http://127.0.0.1:50121"
EVENTS = ["spawn", "attack", "hit", "death"]
FACTIONS = ["鉄甲連合", "深淵群体", "星雲結社", "海兵城塞", "月影獣人", "銀月エルフ", "夜狼獣人", "クロム機械", "深海軍団", "花園妖精"]
SNIPER = [
 ("狙撃班、陣地確保。", "装甲目標、貫通する。"),
 ("群体の眼、照準固定。", "胞子の弾幕、放て。"),
 ("星雲の目、射線を確保。", "星の裁き、撃ち抜く。"),
 ("クェフンテ、狙撃位置についた。", "オドの対物弾、発射。"),
 ("獣の狩人、息を潜める。", "獲物を見つけた、狙撃。"),
 ("銀月の射手、狙撃準備。", "月光の一矢、貫け。"),
 ("狼の射手、獲物を追跡。", "一斉射撃、仕留めろ。"),
 ("精密照準システム、起動。", "レールガン、射撃開始。"),
 ("深海の狙撃手、配置完了。", "圧縮銛、発射。"),
 ("花園の射手、見張り開始。", "花の矢よ、飛んでいけ。")
]
ASSASSIN = [
 ("鉄の影、潜入開始。", "背後を取った、切り込め。"),
 ("群体の暗殺者、潜伏開始。", "寄生する刃、喰らえ。"),
 ("位相を隠す、潜入開始。", "虚空の刃、断ち切れ。"),
 ("キョンサンソプ、潜入する。", "キンパイ作戦、開始だ。"),
 ("黒豹の影、狩りを始める。", "その喉元、もらった。"),
 ("銀月の影、姿を消す。", "静かな刃で、仕留める。"),
 ("狼の影、群れから離脱。", "夜の牙、喰らいつけ。"),
 ("潜入機構、起動。", "バックドア、侵入完了。"),
 ("墨の影、潜航開始。", "闇に溶けろ、急襲。"),
 ("花の影、そっと忍び込む。", "茨の一撃、受けてね。")
]


def request(endpoint, data=None, content_type=None):
    req = urllib.request.Request(BASE + endpoint, data=data, method="POST" if data is not None else "GET")
    if content_type:
        req.add_header("Content-Type", content_type)
    return urllib.request.urlopen(req, timeout=120).read()


def voice_for_role(speakers, role, faction):
    candidates = [
        style["id"]
        for speaker in speakers
        if "男性" in speaker.get("name", "") or "男声" in speaker.get("name", "")
        for style in speaker.get("styles", [])
        if isinstance(style.get("id"), int)
    ]
    if not candidates:
        candidates = [style["id"] for speaker in speakers for style in speaker.get("styles", []) if isinstance(style.get("id"), int)]
    if not candidates:
        raise RuntimeError("VOICEVOX Nemo API returned no available speakers: " + repr(speakers)[:1500])
    return candidates[(faction + (role == 10)) % len(candidates)]


def synthesize(text, speaker):
    params = urllib.parse.urlencode({"text": text, "speaker": speaker})
    query = request("/audio_query?" + params, b"")
    return request("/synthesis?speaker=" + str(speaker), query, "application/json")


def lines_for(faction, role):
    intro, attack = (SNIPER if role == 9 else ASSASSIN)[faction]
    if role == 9:
        return [intro, attack, FACTIONS[faction] + "、位置を変える。", FACTIONS[faction] + "、狙撃班、撤退。"]
    return [intro, attack, FACTIONS[faction] + "、発見された。", FACTIONS[faction] + "、潜入任務、終了。"]


def write_atlas(faction, speakers, index):
    pcm = bytearray()
    pad = b"\x00\x00" * int(24000 * 0.14)
    clips = {}
    with tempfile.TemporaryDirectory() as scratch:
        temp = Path(scratch)
        for role in (9, 10):
            voice = voice_for_role(speakers, role, faction)
            for event, text in zip(EVENTS, lines_for(faction, role)):
                wav = temp / "synth.wav"
                clean = temp / "normalized.wav"
                wav.write_bytes(synthesize(text, voice))
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(clean)], check=True)
                with wave.open(str(clean), "rb") as audio:
                    assert audio.getnchannels() == 1 and audio.getsampwidth() == 2 and audio.getframerate() == 24000
                    frames = audio.readframes(audio.getnframes())
                start = len(pcm) / 48000
                duration = len(frames) / 48000
                pcm.extend(frames)
                pcm.extend(pad)
                clips[(faction, role, event)] = {"atlas": f"spec-f{faction}.ogg", "start": round(start, 5), "duration": round(duration, 5)}
        mixed = temp / "atlas.wav"
        with wave.open(str(mixed), "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(24000)
            audio.writeframes(bytes(pcm))
        output = ROOT / "voices" / f"spec-f{faction}.ogg"
        output.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mixed), "-c:a", "libvorbis", "-q:a", "4", str(output)], check=True)
        assert output.stat().st_size > 1000, output
    for (f, role, event), clip in clips.items():
        index[f"default/{f}-{role}-{event}"] = clip
        index[f"moe/{f}-{role}-{event}"] = clip
    print("VOICEVOX Nemo:", FACTIONS[faction], len(clips), "lines", flush=True)


def main():
    data = json.loads((ROOT / "voice_index.json").read_text(encoding="utf-8"))
    speakers = json.loads(request("/speakers"))
    for faction in range(10):
        write_atlas(faction, speakers, data["clips"])
    assert sum(key.startswith(("default/", "moe/")) and ("-9-" in key or "-10-" in key) for key in data["clips"]) >= 160
    (ROOT / "voice_index.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
