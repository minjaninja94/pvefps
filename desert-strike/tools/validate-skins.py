"""Audit actual runtime files; only complete sets become selectable."""
import json,hashlib,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];SPRITES=ROOT/'assets/sprites'
roles=['assault','rifle','antiarmor','heavy','antiair','siege','flyer','support','sniper','assassin']
ground_path=SPRITES/'ground-special-manifest.json'
ground=json.loads(ground_path.read_text())['entries'] if ground_path.exists() else []
ground_by_id={x['skin']:x for x in ground if x['skin'] not in ('default','moe')}
rows=json.loads((ROOT/'skin-catalog.json').read_text());report={'sets':[],'ready':0,'sheets':0,'poses':0}
for skin in rows:
 errors=[];assets=[]
 for role in roles:
  path=SPRITES/(skin['id']+'-'+role+'-actions.webp')
  try:
   im=Image.open(path);im.load();assert im.size==(384,192) and im.mode=='RGBA','wrong dimensions/mode'
   assert im.getchannel('A').getextrema()[0]==0,'opaque background'
   for pose in range(8):
    c=im.crop((pose%4*96,pose//4*96,pose%4*96+96,pose//4*96+96));assert c.getchannel('A').getbbox(),'empty pose'
   if role=='flyer' and skin['faction'] in [3,4,6,7] and ground:
    assert ground_by_id.get(skin['id'],{}).get('sha256')==hashlib.sha256(path.read_bytes()).hexdigest(),'ground-special replacement mismatch'
   assets.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'size_bytes':path.stat().st_size})
  except Exception as e:errors.append(role+': '+str(e))
 skin['status']='ready' if len(assets)==10 and not errors else 'planned'
 report['sets'].append({'id':skin['id'],'name':skin['name'],'faction':skin['faction'],'status':skin['status'],'assets':assets,'errors':errors})
 if skin['status']=='ready':report['ready']+=1;report['sheets']+=10;report['poses']+=80
(ROOT/'skin-catalog.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
(ROOT/'assets/sprites/skin-build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['python3',str(ROOT/'tools/build-skin-catalog.py')],check=True)
print(json.dumps({k:v for k,v in report.items() if k!='sets'}))
