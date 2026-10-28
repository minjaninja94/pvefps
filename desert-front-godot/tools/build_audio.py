#!/usr/bin/env python3
"""Build Desert Front casting manifest and render local VOICEVOX Nemo lines."""
import ast
import json
import math
import random
import re
import shutil
import struct
import time
import urllib.parse
import urllib.request
import wave
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "desert-strike/assets/audio"
GODOT = ROOT / "desert-front-godot/assets/audio"
SRC = (ROOT / "desert-strike/game-v2.js").read_text(encoding="utf8")
NAMES = [ast.literal_eval("[" + item + "]") for item in re.findall(r"units:\[(.*?)\]", SRC)]
print(len(NAMES),[len(row) for row in NAMES],flush=True)
assert len(NAMES) >= 10 and all(len(row) == 8 for row in NAMES[:10])
NAMES=NAMES[:10]
BASE = [
 ["male","male","male","machine","male","machine","machine","male"],
 ["monster"]*8,
 ["male","male","male","machine","machine","machine","machine","female"],
 ["male","male","male","male","male","machine","machine","male"],
 ["female"]*8,
 ["female"]*8,
 ["male"]*8,
 ["machine"]*8,
 ["monster"]*8,
 ["female"]*8,
]
EVENTS = ["spawn","attack","hit","death"]
LINES = {
 "female":[["行くよ！","出撃します！","前線へ！","まかせて！"],
           ["狙い撃ち！","そこっ！","くらえ！","逃がさない！"],
           ["きゃっ！","うっ！","まだよ！","痛い！"],
           ["みんな、ごめん…","ここまでなの…","あとをお願い…","そんな…"]],
 "male":[["出撃する！","前線へ！","任務開始！","行くぞ！"],
         ["撃て！","そこだ！","くらえ！","照準よし！"],
         ["ぐっ！","まだだ！","くそっ！","うっ！"],
         ["ここまでか…","後は頼んだ…","無念だ…","退くしかない…"]],
}
SPEAKERS = {"female":[10005,10007,10004,10003,10008,10006],"male":[10001,10000,10002]}
manifest = []
for f in range(10):
 for role in range(8):
  base = BASE[f][role]
  moe = base if base in ("monster","machine") and f in (1,7,8) else "female"
  manifest.append({"faction":f,"role":role,"name":NAMES[f][role],"default":base,"moe":moe,
                   "default_speaker":SPEAKERS[base][(f*8+role)%len(SPEAKERS[base])] if base in SPEAKERS else None,
                   "moe_speaker":SPEAKERS["female"][(f*8+role+2)%6] if moe=="female" else None})
WEB.mkdir(parents=True,exist_ok=True)
GODOT.mkdir(parents=True,exist_ok=True)
(WEB/"voice_cast.json").write_text(json.dumps({"schema":1,"units":manifest},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
shutil.copy2(WEB/"voice_cast.json",GODOT/"voice_cast.json")
zip_path = WEB/"ogg.zip"
if zip_path.exists():
 with zipfile.ZipFile(zip_path) as z:
  for name in ["title","sector","airy","pulse","urgent","transmission","victory","hover"]:
   content=z.read("ogg/"+name+".ogg")
   for root in (WEB,GODOT):
    path=root/"music"/(name+".ogg");path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
 zip_path.unlink()

def synthetic(path,kind,event,role,faction):
 rate=16000
 duration={"spawn":.42,"attack":.24,"hit":.32,"death":.62}[event]
 rng=random.Random(faction*100+role*10+EVENTS.index(event))
 samples=[]
 base=95+role*13+faction*3
 for n in range(int(rate*duration)):
  t=n/rate
  env=max(0.0,1-t/duration)**(1.3 if event=="death" else .8)
  if kind=="machine":
   freq=base*(1.2 if event=="attack" else .75)+40*math.sin(2*math.pi*6*t)
   v=.24*math.sin(2*math.pi*freq*t)+.12*math.sin(2*math.pi*freq*2.02*t)
   v+=.05*rng.uniform(-1,1)
  else:
   freq=base*(.58 if event=="death" else 1)+65*math.sin(2*math.pi*9*t)
   v=.2*math.sin(2*math.pi*freq*t)+.1*math.sin(2*math.pi*freq*.5*t)
   v+=.12*rng.uniform(-1,1)
  samples.append(int(max(-1,min(1,v*env))*32767))
 path.parent.mkdir(parents=True,exist_ok=True)
 with wave.open(str(path),"wb") as out:
  out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(struct.pack("<%dh"%len(samples),*samples))

def nemo(text,speaker,path):
 base="http://127.0.0.1:50021"
 params=urllib.parse.urlencode({"text":text,"speaker":speaker})
 with urllib.request.urlopen(urllib.request.Request(base+"/audio_query?"+params,data=b"",method="POST"),timeout=25) as response:
  query=json.load(response)
 query["speedScale"]=1.25
 query["volumeScale"]=.75
 request=urllib.request.Request(base+"/synthesis?speaker="+str(speaker),data=json.dumps(query).encode("utf8"),headers={"Content-Type":"application/json"},method="POST")
 with urllib.request.urlopen(request,timeout=60) as response:
  path.write_bytes(response.read())

def render():
 jobs=[]
 for unit in manifest:
  f,r=unit["faction"],unit["role"]
  for skin in ("default","moe"):
   kind=unit[skin]
   if skin=="moe" and kind==unit["default"] and kind in ("machine","monster"):
    continue
   for index,event in enumerate(EVENTS):
    path=WEB/"voices"/skin/(f"{f}-{r}-{event}.wav")
    if path.exists():
     continue
    jobs.append((unit,skin,kind,index,event,path))
 print("Voice jobs",len(jobs),flush=True)
 for j,(unit,skin,kind,index,event,path) in enumerate(jobs):
  f,r=unit["faction"],unit["role"]
  path.parent.mkdir(parents=True,exist_ok=True)
  if kind in SPEAKERS:
   speaker=unit[skin+"_speaker"]
   text=LINES[kind][index][(f+r)%4]
   for attempt in range(3):
    try:
     nemo(text,speaker,path)
     break
    except Exception as exc:
     if attempt==2: raise RuntimeError(f"{f}-{r}-{skin}-{event}: {exc}") from exc
     time.sleep(1)
  else:
   synthetic(path,kind,event,r,f)
  if j%20==0: print("Rendered",j+1,"/",len(jobs),flush=True)
 for path in (WEB/"voices").rglob("*.wav"):
  dest=GODOT/path.relative_to(WEB)
  dest.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(path,dest)
 print("Voice assets complete",len(list((WEB/"voices").rglob("*.wav"))),flush=True)

if __name__=="__main__":
 render()



