"""Pack generated 4x2 pose sheets into the project's existing 8x96 strip format.
No artwork is painted, replaced, recolored or background-removed here.
"""
import argparse,hashlib,json,io
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from scipy.ndimage import label,gaussian_filter1d
p=argparse.ArgumentParser();p.add_argument('--require-all',action='store_true');args=p.parse_args()
root=Path(__file__).resolve().parents[1];specs=json.loads((root/'art-prompts.json').read_text())['assets'];records=[];issues=[]
preview=Image.new('RGB',(1000,10*160),'#17242e');draw=ImageDraw.Draw(preview)
for number,spec in enumerate(specs):
 ident=spec['id'];source=root/'assets'/f'{ident}-sheet.webp';meta=root/'research'/f'generated-{ident}.json'
 if not meta.exists():continue
 native=Path(json.loads(meta.read_text())['source'])
 if native.exists():source=native
 try:im=Image.open(source).convert('RGBA')
 except Exception as error:
  issues.append({'id':ident,'issue':'source not ready','error':str(error)});continue
 w,h=im.size
 if im.getextrema()[3][0]!=0:issues.append({'id':ident,'issue':'missing transparency'});continue
 source_rows=4 if ident in ['moe-marine-sniper','moe-marine-assassin'] else 2
 start_row=2 if source_rows==4 else 0
 alpha=np.array(im)[:,:,3];profile=gaussian_filter1d((alpha>=96).sum(axis=1).astype(float),3)
 row_bounds=[0]
 for k in range(1,source_rows):
  ideal=k*h/source_rows;radius=h/source_rows*.42;lo=max(0,round(ideal-radius));hi=min(h,round(ideal+radius))
  segment=profile[lo:hi];threshold=float(segment.min())+max(2,w*.004)
  ids=np.flatnonzero(segment<=threshold)+lo
  groups=np.split(ids,np.where(np.diff(ids)>1)[0]+1)
  groups=[v for v in groups if len(v)]
  chosen=min(groups,key=lambda v:abs(float(v.mean())-ideal))
  row_bounds.append(int(round(float(chosen.mean()))))
 row_bounds.append(h)
 tiles=[];boxes=[]
 for n in range(8):
  c,r=n%4,n//4+start_row;tile=im.crop((round(c*w/4),row_bounds[r],round((c+1)*w/4),row_bounds[r+1]))
  pixels=np.array(tile);labs,count=label(pixels[:,:,3]>=64)
  if count:
   areas=np.bincount(labs.ravel());areas[0]=0;main=int(areas.argmax());ys,xs=np.where(labs==main);keep=np.zeros(len(areas),dtype=bool);keep[main]=True
   for part in np.flatnonzero(areas>=areas[main]*.04):
    if not part:continue
    yy,xx=np.where(labs==part)
    if xx.max()>=xs.min()-12 and xx.min()<=xs.max()+12 and yy.max()>=ys.min()-12 and yy.min()<=ys.max()+12:keep[part]=True
   pixels[:,:,3]=np.where(keep[labs],pixels[:,:,3],0);tile=Image.fromarray(pixels)
  box=tile.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
  if not box:raise ValueError(f'{ident}: empty pose {n}')
  if box[0]<2 or box[1]<2 or box[2]>tile.width-2 or box[3]>tile.height-2:issues.append({'id':ident,'pose':n,'issue':'source touches cell edge'})
  boxes.append(list(box));tiles.append(tile.crop(box))
 scale=88/max(max(t.width,t.height) for t in tiles);strip=Image.new('RGBA',(768,96));hashes=[]
 for n,tile in enumerate(tiles):
  tile=tile.resize((max(1,round(tile.width*scale)),max(1,round(tile.height*scale))),Image.Resampling.NEAREST)
  strip.alpha_composite(tile,(n*96+(96-tile.width)//2,92-tile.height));hashes.append(hashlib.sha256(tile.tobytes()).hexdigest())
 output=root/'assets'/f'{ident}.webp'
 encoded=io.BytesIO();strip.save(encoded,format='WEBP',lossless=True,method=4)
 data=encoded.getvalue()
 if len(data)<20 or data[:4]!=b'RIFF':raise ValueError(f'{ident}: invalid WebP encoding')
 temporary=output.with_suffix('.webp.tmp');temporary.write_bytes(data);temporary.replace(output)
 frames=[strip.crop((n*96,0,(n+1)*96,96)) for n in [0,1,0,1,2,3,2,3,4,5,6,4,7,7,7,7]]
 preview_file=root/'assets'/f'{ident}-preview.png';animated=io.BytesIO();frames[0].save(animated,format='PNG',save_all=True,append_images=frames[1:],duration=[160,160,160,160,90,90,90,90,180,80,120,140,100,100,100,160],loop=0,disposal=1,blend=0)
 animation=animated.getvalue()
 if len(animation)<20 or animation[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError(f'{ident}: invalid APNG encoding')
 preview_file.write_bytes(animation)
 records.append({'id':ident,'faction':spec['faction'],'role':spec['role'],'skin':spec['skin'],'file':f'assets/{ident}.webp','animatedPreview':f'assets/{ident}-preview.png','previewSha256':hashlib.sha256(preview_file.read_bytes()).hexdigest(),'cell':96,'columns':8,'rows':1,'paintedPoses':8,'animationFrames':16,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'sourceDimensions':[w,h],'sourceRows':source_rows,'selectedStartRow':start_row,'rowBounds':row_bounds,'sourcePoseBoxes':boxes,'uniquePoseCount':len(set(hashes))})
 # Four previews per faction: base sniper/assassin, moe sniper/assassin.
 fi=['forge','brood','astral','marine','beastkin','elf','furry','robot','octoper','fairy'].index(spec['faction']);ci=(2 if spec['skin']=='moe' else 0)+(1 if spec['role']=='assassin' else 0)
 x=ci*250;y=fi*160;draw.text((x+10,y+6),ident,fill='white');pose=strip.crop((0,0,96,96));pose=pose.resize((132,132),Image.Resampling.NEAREST);preview.paste(pose,(x+58,y+24),pose)
manifest={'version':1,'expected':40,'generated':len(records),'cell':96,'poses':['idle-a','idle-b','move-a','move-b','windup','impact','skill','death'],'frames':16,'frameMapping':'same 8-pose to 16-frame mapping as existing uniform/moe atlases','assets':records,'reviewIssues':issues}
(root/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');preview.save(root/'research/art-contact-sheet.webp',lossless=True)
print(json.dumps({'generated':len(records),'expected':40,'sourceEdgeWarnings':len(issues),'warnedAssets':sorted(set(x['id'] for x in issues))},ensure_ascii=False))
if args.require_all and (len(records)!=40 or any(x['issue']=='missing transparency' for x in issues)):raise SystemExit('Incomplete or invalid art set')
