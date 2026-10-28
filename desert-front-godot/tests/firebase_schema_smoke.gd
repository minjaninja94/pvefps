extends SceneTree
const Cloud = preload("res://scripts/firebase_cloud.gd")
var fail := 0
func check(v: bool,msg: String) -> void:
	if not v:
		fail += 1
		push_error(msg)
func _initialize() -> void:
	call_deferred("_run")
func _run() -> void:
	var c := Cloud.new()
	root.add_child(c)
	var cfg := c._settings()
	check(cfg.get("project","") == "pvefps","existing Firebase project reused")
	check(str(cfg.get("key","")).length() >= 20,"Firebase browser public config present")
	var profile := Cloud.encode_profile("testuid123",{"nickname":"Tester","rating":1542,"level":5,"pvp_wins":3})
	check(profile["fields"]["rating"]["integerValue"]=="1542","encoding rating")
	check(profile["fields"]["verified"]["booleanValue"]==false,"cloud ranking unverified")
	var entry := Cloud.decode_entry({"name":"projects/pvefps/databases/(default)/documents/desertCommunityBoard/testuid123","fields":profile["fields"]})
	check(entry["rating"]==1542 and entry["nickname"]=="Tester","decode Firestore document")
	check(not entry["verified"],"cannot assert verified tier")
	check(Cloud.display_board([entry]).contains("비공식"),"disclosure required")
	check(Cloud.valid_email("commander@example.com"),"valid email")
	check(not Cloud.valid_email("invalid-email"),"reject malformed email")
	check(not Cloud.valid_email("commander example@domain.com"),"reject spaces in email")
	var payload := Cloud.link_email_payload("existing-token"," commander@example.com ","secret-password")
	check(payload.get("idToken","")=="existing-token","link requires current Firebase ID token")
	check(payload.get("email","")=="commander@example.com","email is normalized")
	check(payload.get("password","")=="secret-password","email linking carries password")
	check(payload.get("returnSecureToken",false)==true,"email linking requests updated credentials")
	c.queue_free()
	print("DESERT FRONT FIREBASE REST SCHEMA TEST OK: errors %d" % fail)
	quit(0 if fail==0 else 1)
