from PIL import Image, ImageDraw
import numpy as np, json
from scipy.ndimage import binary_dilation, label
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description='Extract the ten uploaded faction sheets into production action atlases.')
parser.add_argument('input_dir',type=Path,help='Directory containing the original image-gen PNG files')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'assets/sprites')
args=parser.parse_args()
root=args.input_dir
args.output.mkdir(parents=True,exist_ok=True)
dest=args.output
names=['marine','forge','brood','astral','beastkin','elf','furry','robot','octoper','fairy']
files=['image-gen-1(2).png','image-gen-2(2).png']+[f'image-gen-{i}(1).png' for i in range(3,11)]
# Pixel coordinates measured from the supplied reference sheets; no title or grid borders enter a frame.
rows=[(198,1032),(201,1040),(201,1018),(209,1042),(211,1046),(190,1034),(204,1031),(200,1026),(208,1045),(205,1058)]
ends=[1207,1210,1190,1222,1187,1216,1204,1204,1185,1194]
bounds=[[198,287,378,469,559,650,747,889,1033],[200,290,379,473,581,686,799,924,1049],[202,293,385,481,587,692,814,921,1047],[208,298,393,487,598,702,809,916,1038],[212,300,391,486,591,700,813,928,1046],[188,272,364,460,559,672,788,900,1035],[203,294,389,488,608,710,814,920,1028],[200,289,384,486,606,716,831,936,1047],[205,291,376,464,561,657,761,891,1028],[201,292,384,476,581,703,813,939,1052]]
manifest={}
preview=Image.new('RGB',(1000,800),'#14232c'); pg=ImageDraw.Draw(preview)
for idx,(name,file) in enumerate(zip(names,files)):
 im=Image.open(root/file).convert('RGB'); w,h=im.size
 left=134; right=ends[idx]; top,bottom=rows[idx]
 atlas=Image.new('RGBA',(8*96,40*96)); counts=[]
 for role in range(8):
  y0=bounds[idx][role]+3; y1=bounds[idx][role+1]-5
  for act in range(5):
   x0=round(left+(right-left)*act/5)+3; x1=round(left+(right-left)*(act+1)/5)-3
   a=np.array(im.crop((x0,y0,x1,y1)))
   rgb=a.astype('int16'); chrom=rgb.max(2)-rgb.min(2)
   # Checkerboard is neutral grey. Keep dark outlines and colored pixels.
   color=chrom>45
   color=chrom>32
   mask=color|((rgb.max(2)<80)&binary_dilation(color,iterations=4))
   mask[:2]=False;mask[-2:]=False;mask[:,:2]=False;mask[:,-2:]=False
   mask[:,mask.sum(0)>mask.shape[0]*.82]=False
   signal=color.astype(float);width=a.shape[1]
   scores=[]
   for n in [8,7,6,5,4,3]:
    score=0
    for lag in range(max(1,round(width/n)-2),round(width/n)+3):
     u=signal[:,:-lag];v=signal[:,lag:]
     score=max(score,float((u*v).sum()/max(1,(u.sum()*v.sum())**.5)))
    scores.append((score+n*.003,n))
   count=max(scores)[1]
   if act==0:count=[[8,8,8,8,8,4,4,4],[8,8,8,4,6,4,3,4],[4,4,4,4,4,4,4,4],[8,8,8,4,8,4,4,4],[5,5,5,5,6,3,3,5],[7,7,7,5,5,4,3,4],[5,5,5,4,5,4,4,4],[6,6,6,4,4,4,3,4],[7,6,8,4,5,4,4,4],[8,7,7,5,4,4,4,4]][idx][role]
   merged=[[round(i*width/count),round((i+1)*width/count)] for i in range(count)]
   counts.append(len(merged))
   for frame in range(8):
    lo,hi=merged[min(len(merged)-1,frame*len(merged)//8)]
    patch=Image.fromarray(np.dstack([a,mask.astype('uint8')*255])).crop((max(0,lo-1),0,min(a.shape[1],hi+1),a.shape[0]))
    pa=np.array(patch)
    labs,num=label(pa[:,:,3]>0)
    if num:
     areas=np.bincount(labs.ravel());areas[0]=0;largest=areas.argmax()
     keep=areas>=max(8,areas[largest]*.12);keep[0]=False
     pa[:,:,3]=np.where(keep[labs],pa[:,:,3],0)
     patch=Image.fromarray(pa)
    bbox=patch.getbbox()
    if bbox:patch=patch.crop(bbox)
    scale=86/max(patch.width,patch.height)
    patch=patch.resize((max(1,round(patch.width*scale)),max(1,round(patch.height*scale))),Image.Resampling.NEAREST)
    atlas.alpha_composite(patch,(frame*96+(96-patch.width)//2,(role*5+act)*96+91-patch.height))
 atlas.save(dest/(name+'-actions.webp'),lossless=True,method=6)
 portrait_boxes={'brood':(1204,196,1434,390),'robot':(1225,78,1432,285),'fairy':(1205,158,1434,350)}
 portrait=im.crop(portrait_boxes.get(name,(round(w*.845),round(h*.047),w-18,round(h*.271))))
 portrait.resize((384,384),Image.Resampling.LANCZOS).save(dest/(name+'-portrait.webp'),quality=88)
 banner=im.crop((round(w*.47),0,round(w*.835),round(h*.129)))
 banner.resize((720,210),Image.Resampling.LANCZOS).save(dest/(name+'-banner.webp'),quality=88)
 manifest[name]={'columns':8,'rows':40,'cell':96,'actions':['idle','move','attack','skill','death'],'sourcePoseCounts':counts}
 for role in range(8):
  thumb=atlas.crop((0,role*5*96,96,role*5*96+96)).resize((72,72))
  preview.paste(thumb,(idx*100,role*96+25),thumb)
 pg.text((idx*100,5),name,fill='white')
(dest/'reference-manifest.json').write_text(json.dumps(manifest,indent=2))
preview.save(dest/'extraction-preview.png')
print('Extracted 10 faction action atlases, 3200 frame cells, portraits and banners')
