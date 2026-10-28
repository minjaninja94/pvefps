#!/usr/bin/env python3
"""Generate original low-volume combat cues and a restrained two-note base alarm."""
import math,random,struct,wave,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DEST=[ROOT/"desert-strike/assets/audio/sfx",ROOT/"desert-front-godot/assets/audio/sfx"]
RATE=16000
CUES={
 "blade":(.16,310,.42),"rifle":(.12,175,.75),"breaker":(.23,115,.80),
 "armor":(.18,140,.66),"antiair":(.13,270,.68),"siege":(.36,75,.90),
 "flyer":(.16,390,.50),"heal":(.28,520,.25),
 "hit":(.11,215,.55),"death":(.30,105,.5),"explosion":(.48,65,.85),
 "building":(.65,80,.8),"alarm":(.65,440,.18),
}
def write(path,samples):
 path.parent.mkdir(parents=True,exist_ok=True)
 with wave.open(str(path),"wb") as out:
  out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE)
  out.writeframes(struct.pack("<%dh"%len(samples),*samples))
for index,(name,(length,base,level)) in enumerate(CUES.items()):
 rng=random.Random(831+index)
 samples=[]
 for n in range(int(RATE*length)):
  t=n/RATE
  if name=="alarm":
   freq=440 if t < .16 or .32<t<.48 else 370
   env=(min(1,t/.025)*min(1,(length-t)/.09))*.35
   v=math.sin(2*math.pi*freq*t)*env
  elif name=="heal":
   env=math.sin(math.pi*t/length)**2
   v=math.sin(2*math.pi*(base+220*t)*t)*env*.28
  else:
   env=max(0,1-t/length)**(2 if name in ("rifle","hit") else 1)
   noise=rng.uniform(-1,1)
   v=(.4*math.sin(2*math.pi*(base*(1-.55*t/length))*t)+.6*noise)*env*level
  samples.append(int(max(-1,min(1,v))*32767))
 for root in DEST:write(root/(name+".wav"),samples)
print("Generated",len(CUES),"combat cues")

