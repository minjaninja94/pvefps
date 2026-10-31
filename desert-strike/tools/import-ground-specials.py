"""Import the four regenerated 12-theme, eight-pose ground-special atlases.
Keeps original generated PNGs and exact extraction coordinates for reproducibility.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d,label
from scipy.signal import find_peaks
ROOT=Path(__file__).resolve().parents[1];SPRITES=ROOT/'assets/sprites'
NAMES={3:'marine',4:'beastkin',6:'furry',7:'robot'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def grid(alpha,count,axis):
    signal=(alpha[:,:int(alpha.shape[1]*.60)]>70).sum(1) if axis==0 else (alpha>70).sum(0)
    signal=gaussian_filter1d(signal.astype(float),2)
    peaks=find_peaks(signal,distance=int(len(signal)/count*.65),prominence=signal.max()*.12)[0]
    assert len(peaks)==count,(count,peaks.tolist())
    return [0]+[int(x+signal[x:y].argmin()) for x,y in zip(peaks[:-1],peaks[1:])]+[len(signal)]
def main():
    catalog=json.loads((ROOT/'skin-catalog.json').read_text());uniform=json.loads((SPRITES/'uniform-manifest.json').read_text())
    all_rows=[]
    for faction,name in NAMES.items():
        directory=SPRITES/'sources/ground-special';source=directory/f'faction-{faction}-atlas.png'
        image=Image.open(source).convert('RGBA');alpha=np.array(image)[:,:,3]
        assert alpha.min()==0 and alpha.max()>220,'Real alpha required'
        xs,ys=grid(alpha,8,1),grid(alpha,12,0)
        skins=['default','moe']+[s['id'] for s in catalog if s['faction']==faction]
        manifest={'faction':faction,'role':6,'kind':'ground','source':str(source.relative_to(SPRITES)),
            'source_sha256':sha(source),'columns':xs,'rows':ys,'poses':['idle','ready','move-1','move-2','attack-windup','attack-impact','skill','death'],'skins':[]}
        for row,skin in enumerate(skins):
            cells=[]
            for col in range(8):
                cell=image.crop((xs[col],ys[row],xs[col+1],ys[row+1]));rgba=np.array(cell)
                labels,count=label(rgba[:,:,3]>12);areas=np.bincount(labels.ravel());areas[0]=0;largest=int(areas.argmax())
                edge=set(np.concatenate([labels[0,:],labels[-1,:],labels[:,0],labels[:,-1]]))
                discard=[n for n in range(1,count+1) if n!=largest and (n in edge or areas[n]<max(8,areas[largest]*.01))]
                rgba[np.isin(labels,discard),3]=0;cell=Image.fromarray(rgba)
                box=cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
                assert box and (box[2]-box[0])*(box[3]-box[1])>200,(faction,skin,col)
                cells.append(cell.crop(box))
            scale=min(84/max(c.width for c in cells),84/max(c.height for c in cells))
            strip=Image.new('RGBA',(768,96));sheet=Image.new('RGBA',(384,192))
            for col,cell in enumerate(cells):
                cell=cell.resize((max(1,round(cell.width*scale)),max(1,round(cell.height*scale))),Image.Resampling.LANCZOS)
                x=(96-cell.width)//2;y=90-cell.height
                strip.alpha_composite(cell,(col*96+x,y));sheet.alpha_composite(cell,((col%4)*96+x,(col//4)*96+y))
            if skin=='default':
                output=SPRITES/f'uniform-{name}-6.webp';strip.save(output,'WEBP',quality=90,method=4,exact=True)
                item=next(x for x in uniform[name]['units'] if x['role']==6)
                item['groundReplacement']={'source':manifest['source'],'row':row,'sha256':sha(output)}
            elif skin=='moe':
                output=SPRITES/f'moe-{name}-actions.webp';atlas=Image.open(output).convert('RGBA')
                atlas.paste(strip,(0,6*96));atlas.save(output,'WEBP',lossless=True,method=4,exact=True)
            else:
                output=SPRITES/f'{skin}-flyer-actions.webp';sheet.save(output,'WEBP',quality=90,method=4,exact=True)
                old_path=SPRITES/'sources'/skin/'manifest.json';old=json.loads(old_path.read_text())
                item=next(x for x in old['roles'] if x['role']==6);item.update(sha256=sha(output),replacement_source=manifest['source'],replacement_row=row,kind='ground')
                old_path.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
            record={'skin':skin,'row':row,'file':output.name,'sha256':sha(output),'kind':'ground'}
            manifest['skins'].append(record);all_rows.append({'faction':faction,**record})
        (directory/f'faction-{faction}-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (SPRITES/'uniform-manifest.json').write_text(json.dumps(uniform,ensure_ascii=False,indent=2)+'\n')
    (SPRITES/'ground-special-manifest.json').write_text(json.dumps({'sets':48,'poses':384,'entries':all_rows},ensure_ascii=False,indent=2)+'\n')
    print('Imported 48 ground appearances / 384 poses; original sheets and per-row hashes preserved.')
if __name__=='__main__':main()
