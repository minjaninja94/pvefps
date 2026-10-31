"""Split an RGBA 8-column/10-role atlas into ten 4x2 runtime sheets.
Usage: python3 tools/import-skin-atlas.py SKIN_ID SOURCE_PNG [PROMPT_FILE]
Dependencies: pillow numpy scipy
"""
import sys,json,hashlib,shutil,argparse
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d,label
ROOT=Path(__file__).resolve().parents[1]
ROLES=['assault','rifle','antiarmor','heavy','antiair','siege','flyer','support','sniper','assassin']
POSES=['idle','ready','move-1','move-2','attack-windup','attack-impact','skill','death']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def boundaries(alpha,n,axis):
 v=(alpha[:,:int(alpha.shape[1]*.48)]>60).sum(axis=1).astype(float) if axis==0 else (alpha>60).sum(axis=0).astype(float)
 v=gaussian_filter1d(v,1.4);extent=len(v);bounds=[0]
 for k in range(1,n):
  center=extent*k/n;radius=extent/n*.24
  lo=max(bounds[-1]+int(extent/n*.5),round(center-radius));hi=round(center+radius)
  choices=np.arange(lo,hi);cost=v[choices]+((choices-center)/(extent/n))**2*v.max()*.16
  bounds.append(int(choices[cost.argmin()]))
 return bounds+[extent]
def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('skin');parser.add_argument('source');parser.add_argument('prompt',nargs='?')
 parser.add_argument('--rows',help='Explicit source row boundaries, comma separated, for irregular atlas spacing')
 args=parser.parse_args()
 skin,src=args.skin,Path(args.source);target=ROOT/'assets/sprites';archive=target/'sources'/skin;archive.mkdir(parents=True,exist_ok=True)
 im=Image.open(src).convert('RGBA');a=np.array(im)[:,:,3]
 assert a.min()==0 and a.max()>128,'Source requires real transparency'
 source=archive/'atlas.png'
 if source.resolve()!=src.resolve():shutil.copy2(src,source)
 ys=boundaries(a,10,0);xs=boundaries(a,8,1)
 if args.rows:
  ys=[int(v) for v in args.rows.split(',')]
  assert len(ys)==11 and ys[0]==0 and ys[-1]==im.height and all(x<y for x,y in zip(ys,ys[1:])),'Invalid row boundaries'
 manifest={'extractor_version':3,'id':skin,'source':'sources/'+skin+'/atlas.png','source_sha256':sha(source),'source_size':list(im.size),'columns':xs,'rows':ys,'poses':POSES,'roles':[]}
 for row,role in enumerate(ROLES):
  cells=[]
  for col in range(8):
   cell=im.crop((xs[col],ys[row],xs[col+1],ys[row+1]))
   rgba=np.array(cell);labels,count=label(rgba[:,:,3]>12)
   areas=np.bincount(labels.ravel());areas[0]=0;main=int(areas.argmax())
   edge=set(np.concatenate([labels[0,:],labels[-1,:],labels[:,0],labels[:,-1]]))
   discard=[i for i in range(1,count+1) if i!=main and (i in edge or areas[i]<max(12,areas[main]*.015))]
   rgba[np.isin(labels,discard),3]=0;cell=Image.fromarray(rgba)
   box=cell.getchannel('A').point(lambda x:255 if x>12 else 0).getbbox()
   assert box and (box[2]-box[0])*(box[3]-box[1])>100,f'Empty {skin}/{role}/{col}'
   cells.append(cell.crop(box))
  scale=min(84/max(c.width for c in cells),84/max(c.height for c in cells));sheet=Image.new('RGBA',(384,192))
  for col,c in enumerate(cells):
   c=c.resize((max(1,round(c.width*scale)),max(1,round(c.height*scale))),Image.Resampling.LANCZOS)
   sheet.alpha_composite(c,((col%4)*96+(96-c.width)//2,(col//4)*96+90-c.height))
  out=target/f'{skin}-{role}-actions.webp';temp=out.with_suffix('.tmp')
  sheet.save(temp,'WEBP',quality=86,method=4,exact=True);temp.replace(out)
  manifest['roles'].append({'role':[0,1,2,3,4,5,6,7,9,10][row],'key':role,'file':out.name,'sha256':sha(out)})
 if args.rows:manifest['row_boundary_method']='explicit visual correction for irregular source spacing'
 if args.prompt:manifest['prompt']=Path(args.prompt).read_text()
 elif (archive/'manifest.json').exists():
  previous=json.loads((archive/'manifest.json').read_text())
  if 'prompt' in previous:manifest['prompt']=previous['prompt']
 (archive/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'id':skin,'roles':10,'poses':80,'source_sha256':manifest['source_sha256']}))
if __name__=='__main__':main()
