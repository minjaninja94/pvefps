extends SceneTree
const Profile = preload("res://scripts/local_profile.gd")
var errors := 0
func verify(condition: bool, message: String) -> void:
	if not condition:
		errors += 1
		push_error("LOCAL TIER FAIL: "+message)
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	verify(Profile.tier(1000)=="브론즈","starting tier")
	verify(Profile.tier(1100)=="실버","silver boundary")
	verify(Profile.tier(1400)=="골드","gold boundary")
	verify(Profile.tier(1700)=="플래티넘","platinum boundary")
	verify(Profile.tier(2000)=="다이아몬드","diamond boundary")
	verify(Profile.tier(2300)=="마스터","master boundary")
	verify(Profile.sanitize_name("<script>가나다라")=="script가나다라","nickname HTML stripping")
	verify(Profile.sanitize_name("        ")=="지휘관","blank nickname fallback")
	var sample := {"rating":1000,"xp":0,"games":0,"pvp_wins":0,"pvp_losses":0,"solo_wins":0,"solo_losses":0,"coop_wins":0,"coop_losses":0}
	var solo: Dictionary = Profile.result(sample,"classic",0,0,false,8)
	verify(solo["rating"]==1000 and solo["solo_wins"]==1,"solo matches cannot farm PvP rating")
	var practice: Dictionary = Profile.result(sample,"pvp",0,0,false,8)
	verify(practice["rating"]==1000,"offline AI PvP practice cannot farm tier")
	var win: Dictionary = Profile.result(sample,"pvp",0,0,true,8)
	verify(win["rating"]==1024 and win["pvp_wins"]==1,"networked PvP rating progression")
	var loss: Dictionary = Profile.result(win,"pvp",0,1,true,8)
	verify(loss["rating"]==1000 and loss["pvp_losses"]==1,"networked PvP loss progression")
	verify(Profile.level_from_xp(0)==1,"initial level")
	verify(Profile.summary(sample).contains("비공식 티어"),"no trusted global ranking claim")
	var saved := Profile.load_profile()
	verify(str(saved["id"]).length()==24,"random local ID")
	print("DESERT FRONT LOCAL TIER TEST: %d failures" % errors)
	quit(0 if errors==0 else 1)
