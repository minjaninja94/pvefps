"""Original synthesized mechanical effects. No sampled YouTube audio."""
import math,random,wave,struct
from pathlib import Path
RATE=22050
root=Path('dist/audio');root.mkdir(parents=True,exist_ok=True)
profiles={'scout':(83,270,.42),'soldier':(58,155,.64),'heavy':(37,89,.95),'boss':(28,64,1.25),'lizard':(48,190,.7),'walker':(42,120,.9),'super':(96,330,.48)}
def generate(kind,event,base,servo,weight):
 duration={'move':.65,'alert':1.1,'attack':.72,'death':1.8,'sweep':1.4,'missiles':1.6,'laser':3.1,'burst':.95,'blades':1.1}[event]
 rng=random.Random(kind+event);lo=0;hi=0;phase=0;result=[]
 for i in range(int(RATE*duration)):
  t=i/RATE;n=rng.uniform(-1,1);lo+=.04*(n-lo);hi+=.42*(n-hi);grain=hi-lo
  attack=min(1,t/.008);tail=min(1,(duration-t)/.04)
  decay=math.exp(-t/(.14+weight*.25))
  thump=math.sin(2*math.pi*(base*t+base*.026*(1-math.exp(-t*18))))*decay
  metal=sum(math.sin(2*math.pi*base*k*t)*math.exp(-t/(.12+weight*.2)) for k in (3.17,5.83,9.41))/3
  motor=math.sin(2*math.pi*(servo*t+22*math.sin(t*5)))*math.exp(-t/.35)
  hiss=grain*math.exp(-t/(.18+weight*.18))
  if event=='move': value=.54*thump+.16*metal+.15*motor+.22*hiss
  elif event=='alert':
   env=(.25+.75*math.sin(math.pi*min(1,t/duration))**2)
   value=(.24*math.sin(2*math.pi*base*t)+.24*math.sin(2*math.pi*(servo*.58*t+14*t*t))+.11*metal+.13*grain)*env
  elif event=='attack':
   if kind in ('scout','super'):
    # Two original electro-mechanical blade strikes, not a game audio sample.
    value=0
    for offset in (0,.115):
     u=t-offset
     if u>=0:value+=(.36*math.sin(2*math.pi*(145*u+70*u*u))+.3*grain+.18*math.sin(2*math.pi*940*u))*math.exp(-u*17)
   else:value=.6*thump+.28*grain*math.exp(-t/.17)+.22*metal+.12*motor
  elif event=='death':value=.45*thump+.38*grain*math.exp(-t/.45)+.22*math.sin(2*math.pi*(servo*t-28*t*t))*math.exp(-t/.65)
  elif event=='laser':
   env=math.sin(math.pi*t/duration)**.5
   value=(.23*math.sin(2*math.pi*(base*1.7*t+15*t*t))+.14*math.sin(2*math.pi*servo*3*t)+.13*grain)*env
  elif event=='missiles':
   pulse=math.exp(-(t%.18)*25)
   value=.42*thump+.27*grain*pulse+.18*math.sin(2*math.pi*servo*t)*pulse
  elif event=='sweep':value=.4*thump+.3*grain*(.3+.7*math.sin(t*15)**2)*math.exp(-t/.8)+.16*motor
  elif event=='burst':value=(.55*math.sin(2*math.pi*base*t)+.4*grain)*math.exp(-(t%.22)*30)*math.exp(-t/1.2)
  else:value=.4*thump+.26*metal+.22*grain*(.5+.5*math.sin(t*35))*math.exp(-t/.55)
  result.append(math.tanh(value*1.4)*attack*tail)
 # Short reflected mechanical resonance, not a wet musical reverb.
 delay=int(.083*RATE)
 for i in range(len(result)-1,delay,-1):result[i]+=result[i-delay]*.16
 peak=max(abs(v) for v in result);gain=.82/max(1,peak)
 data=struct.pack('<'+'h'*len(result),*(int(v*gain*32767) for v in result))
 path=root/(kind+'-'+event+'.wav')
 with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(data)
 print(path.name,round(duration,2),round(peak*gain,3))
for kind,(base,servo,weight) in profiles.items():
 for event in ['move','alert','attack','death']+(['sweep','missiles','laser','burst','blades'] if kind=='boss' else []):generate(kind,event,base,servo,weight)
