extends Node
## Godot native sound mixer using the same audio files as the web build.
const MUSIC := {"menu":"title","ready":"sector","battle":"pulse","urgent":"urgent","result":"transmission"}
const WEAPONS := ["blade","rifle","breaker","armor","antiair","siege","flyer","heal"]
var levels := {"music":0.22,"voice":0.5,"effects":0.3}
var muted := false
var current_music := ""
var music_player: AudioStreamPlayer
var old_music: AudioStreamPlayer
var active := 0
var last_sound: Dictionary = {}
var last_units: Dictionary = {}
var last_effects: Dictionary = {}
var last_alarm := 0
var voice_clips: Dictionary = {}

func _ready() -> void:
 var data = JSON.parse_string(FileAccess.get_file_as_string("res://assets/audio/voice_index.json"))
 if data is Dictionary:
  voice_clips = data.get("clips",{})
 music("menu")

func _gain(group: String, attenuation: float = 1.0) -> float:
 return 0.0 if muted else float(levels[group]) * attenuation

func _player(path: String, group: String, x: float = 1650.0) -> void:
 if active >= 8 or not ResourceLoader.exists(path):
  return
 var now := Time.get_ticks_msec()
 if now-int(last_sound.get(path,0)) < (240 if group == "voice" else 95):
  return
 last_sound[path] = now
 var player := AudioStreamPlayer.new()
 player.stream = load(path)
 player.volume_db = linear_to_db(maxf(0.001,_gain(group,maxf(0.25,1.0-absf(x-1650.0)/2200.0))))
 add_child(player)
 active += 1
 player.finished.connect(func()->void:active -= 1;player.queue_free())
 player.play()

func music(scene: String) -> void:
 if current_music == scene:
  return
 current_music = scene
 var name: String = MUSIC.get(scene,"title")
 var path := "res://assets/audio/music/" + name + ".ogg"
 if not ResourceLoader.exists(path):
  return
 var next := AudioStreamPlayer.new()
 next.stream = load(path)
 if next.stream is AudioStreamOggVorbis:
  next.stream.loop = true
 next.volume_db = -60.0
 add_child(next)
 next.play()
 old_music = music_player
 music_player = next
 create_tween().tween_property(next,"volume_db",linear_to_db(maxf(0.001,_gain("music"))),0.55)
 if old_music != null:
  var previous := old_music
  var tween := create_tween()
  tween.tween_property(previous,"volume_db",-60.0,0.55)
  tween.tween_callback(func()->void:previous.stop();previous.queue_free())

func refresh() -> void:
 if music_player != null:
  music_player.volume_db = linear_to_db(maxf(0.001,_gain("music")))

func cue(kind: String, x: float = 1650.0) -> void:
 _player("res://assets/audio/sfx/" + kind + ".wav","effects",x)

func unit(faction: int, role: int, skin: String, event: String, x: float = 1650.0) -> void:
 if active >= 8 or muted:
  return
 var variant := "moe" if skin == "moe" else "default"
 var key := "%s/%d-%d-%s" % [variant,faction,role,event]
 if not voice_clips.has(key):
  key = "default/%d-%d-%s" % [faction,role,event]
 if not voice_clips.has(key):
  return
 var now := Time.get_ticks_msec()
 if now-int(last_sound.get(key,0)) < 240:
  return
 last_sound[key] = now
 var clip: Dictionary = voice_clips[key]
 var path: String = "res://assets/audio/voices/" + str(clip["atlas"])
 if not ResourceLoader.exists(path):
  return
 var player := AudioStreamPlayer.new()
 player.stream = load(path)
 player.volume_db = linear_to_db(maxf(0.001,_gain("voice",maxf(0.25,1.0-absf(x-1650.0)/2200.0))))
 add_child(player)
 active += 1
 var cleanup := func() -> void:
  if is_instance_valid(player) and not player.is_queued_for_deletion():
   active -= 1
   player.stop()
   player.queue_free()
 player.finished.connect(cleanup)
 player.play(float(clip["start"]))
 get_tree().create_timer(float(clip["duration"])).timeout.connect(cleanup)

func alarm() -> void:
 var now := Time.get_ticks_msec()
 if now-last_alarm < 9000:
  return
 last_alarm = now
 cue("alarm")

func observe(state: Dictionary) -> void:
 if state.is_empty():
  music("ready")
  last_units.clear()
  last_effects.clear()
  return
 if bool(state.get("ended",false)):
  music("result")
 else:
  var danger := false
  var side: int = state.get("viewer_team",0)
  for row in state.get("cores",[]):
   if float(row[side]) < float(state.get("core_max_hp",2500))*0.38:
    danger = true
  music("urgent" if danger else "battle")
  if danger:
   alarm()
 var upcoming := {}
 for u in state.get("units",[]):
  var id: int = u.get("id",0)
  upcoming[id] = u
  var before: Dictionary = last_units.get(id,{})
  var x: float = u.get("x",1650.0)
  var f: int = u.get("faction",0)
  var role: int = u.get("role",0)
  var skin: String = u.get("skin","default")
  if before.is_empty():
   unit(f,role,skin,"spawn",x)
  elif str(u.get("action",u.get("act",""))) == "attack" and str(before.get("action",before.get("act",""))) != "attack":
   cue(WEAPONS[role],x)
   unit(f,role,skin,"attack",x)
  elif float(u.get("hp",0)) < float(before.get("hp",0)):
   cue("hit",x)
   unit(f,role,skin,"hit",x)
 for id in last_units:
  if not upcoming.has(id):
   var u: Dictionary = last_units[id]
   cue("death",float(u.get("x",1650.0)))
   unit(int(u.get("faction",0)),int(u.get("role",0)),str(u.get("skin","default")),"death",float(u.get("x",1650.0)))
 var upcoming_effects := {}
 for effect in state.get("effects",[]):
  var kind: String = effect.get("kind","")
  if kind not in ["barrage","nuke","pollen","huanglong"]:
   continue
  var key := "%s:%d:%d" % [kind,floori(float(effect.get("x",0))/20.0),floori(float(effect.get("y",0))/20.0)]
  upcoming_effects[key] = true
  if not last_effects.has(key):
   cue("heal" if kind in ["pollen","huanglong"] else "explosion",float(effect.get("x",1650.0)))
 last_effects = upcoming_effects
 last_units = upcoming

func settings_button(owner: Control) -> Button:
 var dialog := AcceptDialog.new()
 dialog.title = "소리 설정"
 owner.add_child(dialog)
 var box := VBoxContainer.new()
 dialog.add_child(box)
 for group in ["music","voice","effects"]:
  var label := Label.new()
  label.text = {"music":"음악","voice":"음성","effects":"효과음"}[group]
  box.add_child(label)
  var slider := HSlider.new()
  slider.custom_minimum_size = Vector2(230,26)
  slider.min_value = 0
  slider.max_value = 100
  slider.value = float(levels[group])*100.0
  slider.value_changed.connect(func(value: float)->void:levels[group]=value/100.0;refresh())
  box.add_child(slider)
 var mute := CheckBox.new()
 mute.text = "전체 음소거"
 mute.toggled.connect(func(value: bool)->void:muted=value;refresh())
 box.add_child(mute)
 var credits := Label.new()
 credits.text = "음악 SRG774 (CC0) · 음성 VOICEVOX Nemo"
 box.add_child(credits)
 var button := Button.new()
 button.text = "소리 설정"
 button.pressed.connect(func()->void:dialog.popup_centered())
 return button

