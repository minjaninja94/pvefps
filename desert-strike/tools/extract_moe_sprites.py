from PIL import Image, ImageDraw
from pathlib import Path
import json,hashlib
import numpy as np
from scipy.ndimage import gaussian_filter1d, label
import argparse
parser=argparse.ArgumentParser(description='Slice ten generated alternate-skin sheets into production atlases')
parser.add_argument('input',type=Path,help='Directory containing the original generated PNG files')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'assets/sprites')
args=parser.parse_args()
dest=args.output
dest.mkdir(parents=True,exist_ok=True)
mapping={
 'forge':'exec-8608f177-7fcd-4f38-81be-27093b745c35.png',
 'brood':'exec-cb6b9deb-8308-4f73-abfd-ad6da57e768c.png',
 'marine':'exec-8e7acb4e-b5c9-4774-8fdf-7485d23458cc.png',
 'astral':'exec-8cafe49e-5513-458a-9a51-db7ac00931eb.png',
 'elf':'exec-e811aae6-3f13-4365-9623-e8a62aad0137.png',
 'furry':'exec-397c4792-e719-48cc-9288-de33a45d89de.png',
 'robot':'exec-a4724813-aae4-4de7-be78-40c64f3df798.png',
}
mapping.update({'octoper':'exec-613f9512-fd5f-4d4d-8e6c-f9392aca2a32.png','beastkin':'exec-ee77f15f-f01a-4ddc-981e-a47106db0cc0.png','fairy':'exec-bda08fd2-2514-44df-b67b-94b3c6aac61e.png'})
manifest={};preview=Image.new('RGB',(1000,850),'#17212c');g=ImageDraw.Draw(preview)
names=['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy']
for f,name in enumerate(names):
 if name not in mapping:continue
 source=args.input/mapping[name];im=Image.open(source).convert('RGBA');w,h=im.size
 alpha=np.array(im)[:,:,3];row=gaussian_filter1d((alpha>150).sum(1).astype(float),3)
 bounds=[0]+[int(round(k*h/8-h*.045)+np.argmin(row[max(0,round(k*h/8-h*.045)):min(h,round(k*h/8+h*.045))])) for k in range(1,8)]+[h]
 out=Image.new('RGBA',(768,768))
 for r in range(8):
  for c in range(8):
   crop=im.crop((round(c*w/8),bounds[r],round((c+1)*w/8),bounds[r+1]))
   pixels=np.array(crop);labs,count=label(pixels[:,:,3]>64)
   if count:
    sizes=np.bincount(labs.ravel());sizes[0]=0;largest=int(sizes.argmax());ys,xs=np.where(labs==largest)
    keep=np.zeros(len(sizes),dtype=bool);keep[largest]=True
    for part in np.flatnonzero(sizes>=sizes[largest]*.05):
     yy,xx=np.where(labs==part)
     if sizes[part]>=sizes[largest]*.05 and xx.max()>=xs.min()-8 and xx.min()<=xs.max()+8 and yy.max()>=ys.min()-8 and yy.min()<=ys.max()+8:keep[part]=True
    pixels[:,:,3]=np.where(keep[labs],pixels[:,:,3],0);crop=Image.fromarray(pixels)
   box=crop.getbbox()
   if box:crop=crop.crop(box)
   scale=88/max(crop.width,crop.height);crop=crop.resize((max(1,round(crop.width*scale)),max(1,round(crop.height*scale))),Image.Resampling.LANCZOS)
   out.alpha_composite(crop,(c*96+(96-crop.width)//2,r*96+92-crop.height))
 if name in ['forge','robot']:
  special=args.input/('exec-bcd558f2-e599-439c-ad66-911657e5086d.png' if name=='forge' else 'exec-4b123f99-4bfb-4010-acd8-955962da43bc.png')
  sp=Image.open(special).convert('RGBA');sw,sh=sp.size
  for c in range(8):
   xx=c%4;yy=c//4;tile=sp.crop((round(xx*sw/4),round(yy*sh/2),round((xx+1)*sw/4),round((yy+1)*sh/2)))
   box=tile.getbbox()
   if box:tile=tile.crop(box)
   factor=88/max(tile.width,tile.height);tile=tile.resize((max(1,round(tile.width*factor)),max(1,round(tile.height*factor))),Image.Resampling.LANCZOS)
   out.paste((0,0,0,0),(c*96,6*96,(c+1)*96,7*96));out.alpha_composite(tile,(c*96+(96-tile.width)//2,6*96+92-tile.height))
 out.save(dest/('moe-'+name+'-actions.webp'),lossless=True,method=6)
 for r in range(8):preview.paste(out.crop((0,r*96,96,(r+1)*96)),(f*100,r*100+35),out.crop((0,r*96,96,(r+1)*96)))
 g.text((f*100,8),name,fill='white');manifest[name]={'columns':8,'roles':8,'cell':96,'rowBounds':bounds,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'poses':['idle-a','idle-b','move-a','move-b','windup','impact','skill','death']}
(dest/'moe-manifest.json').write_text(json.dumps(manifest,indent=2))
preview.save(dest/'moe-extraction-preview.png');print('Extracted',len(manifest),'moe faction atlases')
