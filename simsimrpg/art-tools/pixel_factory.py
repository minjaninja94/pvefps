#!/usr/bin/env python3
"""simsimrpg sprite factory v0.1 - deterministic procedural prototype and atlas QA.

Generates original prototype pixels, not DnF-quality hand-drawn animation.
Requires Pillow. Source: simsimrpg MONSTERS_XX_XX.json files.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

MOTIONS = {
    'common': {'idle': 6, 'walk': 8, 'attack_a': 8, 'attack_b': 6, 'hurt': 4, 'death': 8},
    'special': {'idle': 6, 'walk': 8, 'attack_a': 8, 'attack_b': 8, 'skill': 8, 'hurt': 4, 'death': 10},
    'elite': {'idle': 8, 'walk': 10, 'attack_a': 10, 'attack_b': 10, 'skill_a': 12, 'skill_b': 12, 'hurt': 6, 'death': 12},
    'boss': {'idle': 10, 'walk': 10, 'run': 12, 'attack_a': 12, 'attack_b': 12, 'skill_a': 16, 'skill_b': 20, 'special': 24, 'hurt': 8, 'death': 20, 'phase_change': 16}
}
BASE = 80
BG = (0, 0, 0, 0)
INK = (24, 27, 37, 255)
PALETTES = [(1., 1., 1.), (1.13, 1.12, 1.04), (.75, .95, 1.28), (1.26, 1.05, .72), (.8, .79, .8), (1.27, .62, .61), (.8, 1.16, .7), (1.25, 1.13, .67), (.71, .64, 1.05), (.48, .55, .74)]
QUAD = {'beast', 'dragon', 'ocean'}
OOZE = {'ooze', 'flora', 'nightmare'}
ARTHROPOD = {'swarm', 'alien'}
MECH = {'steam', 'robot', 'relic'}
HUMANOID = {'undead', 'demon', 'cult', 'criminal', 'military', 'mutant', 'zombie', 'assassin', 'celestial'}


def stable_seed(value: str) -> int:
    return int.from_bytes(hashlib.sha256(value.encode('utf8')).digest()[:8], 'big')


def mixed(c, factor):
    return tuple(max(0, min(255, round(x * factor))) for x in c[:3]) + (255,)


def color_variant(c, palette):
    return tuple(max(0, min(255, round(c[i]*palette[i]))) for i in range(3)) + (c[3],)


def palette_for(monster, variant=0):
    rng = random.Random(stable_seed(monster['monster_id'] + '|style'))
    hue = rng.randrange(0, 6)
    bases = [(105, 157, 102, 255), (148, 105, 123, 255), (103, 133, 172, 255),
             (176, 132, 78, 255), (126, 118, 161, 255), (140, 153, 144, 255)]
    base = bases[hue]
    p = PALETTES[variant]
    return {k:color_variant(v,p) for k,v in {
        'body':base, 'bright':mixed(base,1.35), 'dark':mixed(base,.68),
        'metal':(170,181,182,255), 'eye':(237,225,109,255), 'accent':(222,94,72,255)
    }.items()}


def point(x, y):
    return (round(x), round(y))


def limb(draw, a, b, width, color):
    draw.line([point(*a), point(*b)], fill=INK, width=width+4, joint='curve')
    draw.line([point(*a), point(*b)], fill=color, width=width, joint='curve')
    r=width/2+1
    draw.ellipse([b[0]-r,b[1]-r,b[0]+r,b[1]+r], fill=color, outline=INK, width=1)


def poly(draw, vertices, fill):
    draw.polygon([point(*v) for v in vertices], fill=fill)
    draw.line([point(*v) for v in vertices + [vertices[0]]], fill=INK, width=2)


def pose(monster, motion, i, n, variant=0, cell=80):
    """Deterministic original low-res placeholder frame. Does not imply unique painted originals."""
    kind = monster.get('art_rig_group', 'beast')
    rng = random.Random(stable_seed(monster['monster_id']))
    p = palette_for(monster, variant)
    im = Image.new('RGBA',(BASE,BASE),BG)
    d = ImageDraw.Draw(im)
    t = (i+.25)/n
    cycle = math.sin(t*math.tau)
    walk = motion in ('walk','run')
    attacking = motion.startswith('attack') or motion.startswith('skill') or motion == 'special'
    hurt = motion == 'hurt'
    dying = motion == 'death'
    phase = motion == 'phase_change'
    s = (1 if walk else .25)*cycle
    bounce = (abs(cycle)*3 if walk else math.sin(t*math.tau)*1.1)
    strike = max(0, math.sin(math.pi*min(1,t*1.45))) if attacking else 0
    sink = (min(23,t*27) if dying else 0)
    scale = 1.0 + (0.03 * math.sin(t*math.tau*2) if phase else 0)
    cx=40; cy=55 + (3 if hurt else 0) + sink
    d.ellipse((18,65,64,70),fill=(0,0,0,47))
    if kind in QUAD:
        torso_y=cy-15-bounce
        tail=[(20,torso_y+2),(10-5*s,torso_y-7-2*s),(8,torso_y+1)]
        poly(d,tail,p['dark'])
        for leg_x,k in [(27,1),(36,-1),(52,-1),(58,1)]:
            sway=6*s*k
            limb(d,(leg_x,torso_y+6),(leg_x+sway,66-sink*.1),5,p['dark'] if k<0 else p['body'])
        d.ellipse((18,torso_y-12,60,torso_y+11), fill=p['body'],outline=INK,width=2)
        d.polygon([(24,torso_y-9),(28,torso_y-18),(32,torso_y-10)], fill=p['bright'])
        headx=60+strike*3
        d.ellipse((headx-7,torso_y-14,headx+12,torso_y+4),fill=p['bright'],outline=INK,width=2)
        d.ellipse((headx+5,torso_y-9,headx+7,torso_y-7),fill=p['eye'])
        d.line((headx+7,torso_y-1,headx+12,torso_y+1),fill=INK,width=2)
        if kind=='dragon':
            poly(d,[(30,torso_y-12),(27,torso_y-29),(49,torso_y-14),(42,torso_y-9)],p['dark'])
            d.polygon([(65,torso_y-12),(67,torso_y-23),(69,torso_y-11)],fill=p['accent'])
        if kind=='ocean':
            d.polygon([(25,torso_y-6),(34,torso_y-22),(38,torso_y-6)],fill=p['dark'])
    elif kind in OOZE:
        amplitude=3 if kind!='flora' else 1
        pts=[]
        for k in range(12):
            angle=math.tau*k/12
            r=21+(rng.randrange(-3,4))+amplitude*math.sin(angle*3 + t*math.tau)
            pts.append((cx+math.cos(angle)*r,cy-13+math.sin(angle)*r*(.85 if not dying else .4)))
        poly(d,pts,p['body'])
        for ex in [33,45]:
            d.rectangle((ex,cy-20,ex+4,cy-15),fill=p['eye'],outline=INK,width=1)
        if kind=='flora':
            d.line((40,cy-32,40,cy-45),fill=p['dark'],width=4)
            d.ellipse((26,cy-55,54,cy-39),fill=p['bright'],outline=INK,width=2)
        if kind=='nightmare':
            d.polygon([(24,cy-28),(16,cy-46),(31,cy-38)],fill=p['dark'])
        if attacking:
            d.ellipse((55+strike*10,cy-26,63+strike*10,cy-18),fill=p['accent'],outline=INK,width=1)
    elif kind in ARTHROPOD:
        body_y=cy-17-bounce
        for k in range(3):
            x=24+k*14
            for side in [-1,1]:
                ang=(k-1)*6+cycle*4*side
                limb(d,(x,body_y),(x+ang,body_y+side*20),2,p['dark'])
        d.ellipse((21,body_y-13,58,body_y+13),fill=p['body'],outline=INK,width=2)
        d.ellipse((54,body_y-9,68,body_y+6),fill=p['bright'],outline=INK,width=2)
        d.ellipse((62,body_y-4,65,body_y-1),fill=p['eye'])
        for sign in [-1,1]:
            d.line((60,body_y-5,66+sign*5,body_y-20),fill=p['dark'],width=2)
        if attacking: d.line((67,body_y,75,body_y+strike*7),fill=p['accent'],width=3)
    else:
        # Humanoids/industrial constructs: articulated limbs and weapon layers.
        by=cy-16-bounce
        legS=6*s
        for sign,x in [(-1,33),(1,47)]:
            knee=(x-sign*legS*.5,by+18)
            foot=(x-sign*legS,67-sink*.12)
            limb(d,(x,by+8),knee,5,p['dark'])
            limb(d,knee,foot,5,p['body'])
        if kind in MECH:
            d.rounded_rectangle((28,by-15,53,by+14),radius=3,fill=p['metal'],outline=INK,width=2)
            d.rectangle((35,by-6,47,by+3),fill=p['dark'])
            d.rectangle((37,by-5,45,by+1),fill=p['accent'])
        else:
            d.polygon([(30,by-16),(50,by-16),(54,by+15),(26,by+15)],fill=p['body'])
            d.line((30,by-16,50,by-16,54,by+15,26,by+15,30,by-16),fill=INK,width=2)
            d.rectangle((32,by+1,48,by+4),fill=p['dark'])
        headY=by-26 + (math.sin(t*math.tau)*.5)
        d.ellipse((31,headY-10,49,headY+8),fill=p['bright'],outline=INK,width=2)
        d.point((44,headY-1),fill=INK)
        if kind in MECH:
            d.rectangle((33,headY-4,48,headY+1),fill=p['dark'])
            d.rectangle((39,headY-3,47,headY),fill=p['accent'])
        if kind=='undead':
            d.rectangle((36,headY+6,42,headY+8),fill=p['metal'])
        if kind=='demon':
            poly(d,[(31,headY-7),(26,headY-18),(36,headY-9)],p['dark'])
            poly(d,[(44,headY-9),(53,headY-18),(50,headY-6)],p['dark'])
        leftHand=(22-2*s,by-1+4*abs(s))
        rightHand=(58+strike*8,by+2-strike*16)
        limb(d,(31,by-11),leftHand,5,p['body'])
        limb(d,(49,by-11),rightHand,5,p['body'])
        if monster.get('type_id') in ('ranger','hexer','support','commander'):
            d.line((rightHand[0]-2,rightHand[1]+2,rightHand[0]+12,rightHand[1]+7),fill=INK,width=5)
            d.line((rightHand[0]-2,rightHand[1]+2,rightHand[0]+12,rightHand[1]+7),fill=p['metal'],width=3)
        else:
            d.line((rightHand[0],rightHand[1],rightHand[0]+5+strike*9,rightHand[1]-11-strike*7),fill=INK,width=5)
            d.line((rightHand[0],rightHand[1],rightHand[0]+5+strike*9,rightHand[1]-11-strike*7),fill=p['metal'],width=2)
        if monster.get('type_id')=='bulwark':
            d.ellipse((leftHand[0]-10,leftHand[1]-8,leftHand[0]+5,leftHand[1]+12),fill=p['dark'],outline=INK,width=2)
    if attacking and t>.32 and t<.7:
        d.line((61,29,75,20+cycle*3),fill=p['accent'],width=2)
    if hurt:
        d.line((18,18,29,26),fill=p['accent'],width=3)
    if phase:
        d.ellipse((13,12,68,74),outline=p['accent'],width=1)
    if cell!=BASE: im=im.resize((cell,cell),resample=Image.Resampling.NEAREST)
    return im


def load_catalog(root:Path):
    paths=sorted(root.glob('MONSTERS_[0-9][0-9]_[0-9][0-9].json'))
    if not paths: raise FileNotFoundError(f'No MONSTERS_XX_XX.json files in {root}')
    monsters=[]
    for path in paths:
        content=json.loads(path.read_text(encoding='utf-8'))
        monsters.extend(content['monsters'])
    ids=[x['monster_id'] for x in monsters]
    if len(ids)!=len(set(ids)): raise ValueError('Duplicate monster IDs')
    return monsters


def pack(frames, cell, cols=8):
    rows=math.ceil(len(frames)/cols)
    out=Image.new('RGBA',(cell*cols,cell*rows),BG)
    for i,im in enumerate(frames): out.paste(im,((i%cols)*cell,(i//cols)*cell))
    return out


def export_monster(monster, out:Path, cell:int=80, variant:int=0, motion_only=None):
    rank=monster['rank']; req=MOTIONS[rank]
    target=out/monster['monster_id'];target.mkdir(parents=True,exist_ok=True)
    meta={'schema_version':1,'id':monster['monster_id'],'rank':rank,'art_generation_type':'procedural_placeholder_not_painted_unique_art','variant':f'P{variant+1:02d}','fps_hint':12,'motions':{}}
    montage=[]
    for motion,n in req.items():
        if motion_only and motion not in motion_only:continue
        frames=[pose(monster,motion,i,n,variant,cell) for i in range(n)]
        atlas=pack(frames,cell)
        atlas.save(target/f'{motion}.png',optimize=True)
        hashes=[hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames]
        meta['motions'][motion]={'frames':n,'unique_raster_hashes':len(set(hashes)),'atlas':f'{motion}.png','cell':[cell,cell], 'columns':8,'loop':motion in ('idle','walk','run'),'frame_durations_ms':[83]*n, 'source_quality':'procedural_geometry_not_original_painted_frames'}
        montage.append(frames[min(len(frames)-1,math.floor(len(frames)*.4))])
    (target/'animations.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    if montage:pack(montage,cell,cols=min(8,len(montage))).save(target/'motion_preview.png')
    return meta


def import_grid(sheet:Path,dst:Path,cols:int,rows:int):
    im=Image.open(sheet).convert('RGBA')
    if cols<1 or rows<1 or im.width%cols or im.height%rows:raise ValueError('Invalid grid or non-divisible sheet size')
    w,h=im.width//cols,im.height//rows
    frames=[im.crop(((i%cols)*w,(i//cols)*h,(i%cols+1)*w,(i//cols+1)*h)) for i in range(cols*rows)]
    hashes=[hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
    content={'sheet':str(sheet),'frames':len(frames),'unique_exact_frames':len(set(hashes)),'duplicate_exact_frames':len(frames)-len(set(hashes)),'has_alpha':im.getextrema()[3][0]<255,'cell':[w,h],'source_quality':'imported_original_unverified'}
    dst.mkdir(parents=True,exist_ok=True)
    for i,f in enumerate(frames):f.save(dst/f'{i:03d}.png')
    (dst/'qa_report.json').write_text(json.dumps(content,ensure_ascii=False,indent=2),encoding='utf-8')
    return content


def main():
    parser=argparse.ArgumentParser(description='simsimrpg pixel factory: procedural prototyping or artist sprite-sheet slicing')
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--out',type=Path,default=Path('pixel-output'))
    parser.add_argument('--id',default=None,help='e.g. M01-01-01')
    parser.add_argument('--limit',type=int,default=1,help='maximum monsters, use --limit 0 for all 2000')
    parser.add_argument('--cell',type=int,default=80)
    parser.add_argument('--palette',type=int,default=1,help='1..10')
    parser.add_argument('--motion',action='append',default=None)
    parser.add_argument('--import-sheet',type=Path)
    parser.add_argument('--cols',type=int,default=8)
    parser.add_argument('--rows',type=int,default=1)
    args=parser.parse_args()
    if args.import_sheet:
        print(json.dumps(import_grid(args.import_sheet,args.out,args.cols,args.rows),ensure_ascii=False,indent=2));return
    if not 1<=args.palette<=10:parser.error('--palette must be 1..10')
    if args.cell<40 or args.cell>256:parser.error('--cell must be 40..256')
    catalog=load_catalog(args.root)
    chosen=[m for m in catalog if m['monster_id']==args.id] if args.id else catalog
    if args.id and not chosen:parser.error(f'Unknown monster id: {args.id}')
    if args.limit:chosen=chosen[:args.limit]
    total=0;frames=0
    for m in chosen:
        spec=export_monster(m,args.out,args.cell,args.palette-1,args.motion)
        total+=1;frames+=sum(x['frames'] for x in spec['motions'].values())
    print(json.dumps({'status':'generated_procedural_placeholder_not_painted_art','monsters':total,'animation_frames':frames,'output':str(args.out)},ensure_ascii=False))

if __name__=='__main__':main()