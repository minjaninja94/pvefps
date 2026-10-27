"""Pack regenerated default units into independent, padded animation strips.

Only unambiguous source poses are accepted. Large impact/summon columns can
cross into adjacent artwork, so playback reuses the complete windup sprite
instead of importing an extra body or cutting a neighboring character.
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from scipy.ndimage import gaussian_filter1d, label

parser=argparse.ArgumentParser()
parser.add_argument('sources',type=Path,help='JSON map of faction names to generated source PNG paths')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'assets/sprites')
parser.add_argument('--preview',type=Path)
args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
names=['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy']
sources=json.loads(args.sources.read_text())
manifest={}
preview=Image.new('RGB',(1000,840),'#172630');pen=ImageDraw.Draw(preview)
# Exclude impact and summoning columns: some generated effects bridge cells.
source_poses=[0,1,2,3,0,4,4,7]
for f,name in enumerate(names):
 if name not in sources:continue
 path=Path(sources[name]);im=Image.open(path).convert('RGBA');w,h=im.size
 alpha=np.array(im)[:,:,3]
 # Find the actual empty row gutter near each intended row boundary.
 signal=gaussian_filter1d((alpha>96).sum(1).astype(float),2)
 bounds=[0]
 for row in range(1,8):
  lo=round((row-.22)*h/8);hi=round((row+.22)*h/8)
  minimum=signal[lo:hi].min();candidates=np.flatnonzero(signal[lo:hi]<=minimum+1)+lo
  bounds.append(int(min(candidates,key=lambda x:abs(x-row*h/8))))
 bounds.append(h)
 units=[]
 for role in range(8):
  accepted=source_poses.copy()
  # These columns depict a volley/summoned group instead of a single unit.
  if (name=='octoper' and role in [2,4,6,7]) or (name=='robot' and role==4):
   accepted=[0,1,2,3,0,2,3,7]
  if name=='octoper' and role==4:accepted[7]=0
  if name=='octoper' and role==2:accepted=[0,1,0,1,0,1,1,7]
  tiles=[];boxes=[]
  for pose in accepted:
   crop=im.crop((round(pose*w/8),bounds[role],round((pose+1)*w/8),bounds[role+1]))
   pixels=np.array(crop);labs,count=label(pixels[:,:,3]>96)
   if not count:raise ValueError(f'Empty {name}/{role}/{pose}')
   sizes=np.bincount(labs.ravel());sizes[0]=0;largest=int(sizes.argmax())
   yy,xx=np.where(labs==largest)
   # Remove disconnected specks from neighboring effects; keep only components
   # close to this unit's silhouette (weapons, wings and compact spell effects).
   keep=np.zeros(len(sizes),dtype=bool);keep[largest]=True
   for part in np.flatnonzero(sizes>=max(10,sizes[largest]*.10)):
    y,x=np.where(labs==part)
    if x.max()>=xx.min()-6 and x.min()<=xx.max()+6 and y.max()>=yy.min()-6 and y.min()<=yy.max()+6:keep[part]=True
   pixels[:,:,3]=np.where(keep[labs],pixels[:,:,3],0)
   crop=Image.fromarray(pixels);box=crop.getbbox();boxes.append(list(box));tiles.append(crop.crop(box))
  # One shared scale per unit keeps its body size stable through animation.
  scale=min(80/max(t.width for t in tiles),80/max(t.height for t in tiles))
  strip=Image.new('RGBA',(768,96))
  for pose,tile in enumerate(tiles):
   tile=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.NEAREST)
   strip.alpha_composite(tile,(pose*96+(96-tile.width)//2,88-tile.height))
  # Existing dedicated vehicles/cavalry/human Huanglong remain authoritative.
  special={'marine':{6:0,7:4},'beastkin':{6:1},'furry':{6:2},'robot':{6:3}}
  if role in special.get(name,{}):
   old=Image.open(args.output/'special-actions.webp').convert('RGBA');row=special[name][role]
   # Same semantic order as the original dedicated renderer.
   for pose,original in enumerate([0,0,1,2,3,4,5,7]):
    t=old.crop((original*96,row*96,(original+1)*96,(row+1)*96));box=t.getbbox()
    # The legacy special sheet has tiny fragments on some row boundaries.
    # Keep its complete main silhouette, not the neighboring-row fragments.
    pixels=np.array(t)
    if name=='marine' and role==7:pixels[:24,:,3]=0
    labs,count=label(pixels[:,:,3]>96)
    if count:
     sizes=np.bincount(labs.ravel());sizes[0]=0;big=int(sizes.argmax())
     yy,xx=np.where(labs==big);keep=np.zeros(len(sizes),dtype=bool);keep[big]=True
     for part in np.flatnonzero(sizes>=max(10,sizes[big]*.10)):
      y,x=np.where(labs==part)
      if x.max()>=xx.min()-6 and x.min()<=xx.max()+6 and y.max()>=yy.min()-6 and y.min()<=yy.max()+6:keep[part]=True
     pixels[:,:,3]=np.where(keep[labs],pixels[:,:,3],0);t=Image.fromarray(pixels)
    box=t.getbbox()
    if box:t=t.crop(box)
    k=min(80/t.width,80/t.height);t=t.resize((max(1,round(t.width*k)),max(1,round(t.height*k))),Image.Resampling.NEAREST)
    strip.paste((0,0,0,0),(pose*96,0,(pose+1)*96,96));strip.alpha_composite(t,(pose*96+(96-t.width)//2,88-t.height))
  dest=args.output/f'uniform-{name}-{role}.webp';temporary=dest.with_suffix('.webp.tmp')
  strip.save(temporary,format='WEBP',lossless=True,method=6)
  with Image.open(temporary) as check:
   check.load()
   assert check.size==(768,96)
  temporary.replace(dest)
  units.append({'role':role,'file':dest.name,'sourcePoses':accepted,'sourceBoxes':boxes,'preservedSpecial':role in special.get(name,{})})
  t=strip.crop((0,0,96,96));preview.paste(t,(f*100,role*100+32),t)
 pen.text((f*100+3,8),name,fill='white')
 manifest[name]={'cell':96,'columns':8,'source':path.name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rowBounds':bounds,'sourcePoses':source_poses,'units':units}
(args.output/'uniform-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if args.preview:preview.save(args.preview)
print(f'Packed {len(manifest)*8} independent padded unit strips')
