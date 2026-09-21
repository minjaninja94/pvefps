import {SPRITE_MANIFEST} from './sprite-manifest.js';

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.decoding='async';
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('스프라이트 이미지를 불러오지 못했습니다: '+src));
    image.src=new URL(src,import.meta.url).href;
  });
}
function atlasCanvas(image,chromaKey){
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:chromaKey});ctx.drawImage(image,0,0);
  if(chromaKey){
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
    for(let i=0;i<d.length;i+=4){
      const r=d[i],g=d[i+1],b=d[i+2],magenta=Math.min(r,b)-g;
      if(r>150&&b>150&&magenta>55)d[i+3]=magenta>115?0:Math.round(255*(1-(magenta-55)/60));
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.putImageData(pixels,0,0);
  }
  return canvas;
}
export function spriteCellRect(def,width,height,row,column){
  const cellWidth=width/def.columns,cellHeight=height/def.rows;
  const bleedGuardBottom=Math.max(0,Math.min(def.bleedGuardBottom||0,cellHeight-1));
  return {sourceX:column*cellWidth,sourceY:row*cellHeight,sourceWidth:cellWidth,sourceHeight:cellHeight-bleedGuardBottom,cellWidth,cellHeight};
}
export function atlasComponentSlot(def,width,height,centerX,centerY){
  const column=Math.max(0,Math.min(def.columns-1,Math.round(centerX/(width/def.columns)-.5)));
  const row=Math.max(0,Math.min(def.rows-1,Math.round(centerY/(height/def.rows)-.5)));
  return {row,column};
}
function componentFrames(THREE,canvas,def){
  const source=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),pixels=source.data,width=canvas.width,height=canvas.height;
  const labels=new Int32Array(width*height),queue=new Int32Array(width*height),components=[];
  let label=0;
  for(let start=0;start<labels.length;start++){
    if(labels[start]||pixels[start*4+3]<=8)continue;
    label++;let head=0,tail=0,area=0,sumX=0,sumY=0,minX=width,minY=height,maxX=0,maxY=0;
    labels[start]=label;queue[tail++]=start;
    while(head<tail){
      const index=queue[head++],x=index%width,y=(index/width)|0;area++;sumX+=x;sumY+=y;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const next=ny*width+nx;if(!labels[next]&&pixels[next*4+3]>8){labels[next]=label;queue[tail++]=next;}
      }
    }
    if(area>=(def.componentMinArea||20))components.push({label,area,centerX:sumX/area,centerY:sumY/area,minX,minY,maxX,maxY});
  }
  const assigned=Array.from({length:def.rows},()=>Array(def.columns).fill(null));
  for(const component of components){
    const {row,column}=atlasComponentSlot(def,width,height,component.centerX,component.centerY),previous=assigned[row][column];
    if(!previous||component.area>previous.area)assigned[row][column]=component;
  }
  const outputSize=def.componentOutputSize||180,padding=def.componentPadding||4,frames=[];
  for(let row=0;row<def.rows;row++){
    const rowComponents=assigned[row],maxWidth=Math.max(...rowComponents.map(item=>item?item.maxX-item.minX+1:1)),maxHeight=Math.max(...rowComponents.map(item=>item?item.maxY-item.minY+1:1));
    const scale=Math.min((outputSize-padding*2)/maxWidth,(outputSize-padding*2)/maxHeight),cells=[];
    for(const component of rowComponents){
      const cell=document.createElement('canvas');cell.width=outputSize;cell.height=outputSize;
      if(component){
        const cropWidth=component.maxX-component.minX+1,cropHeight=component.maxY-component.minY+1,clean=document.createElement('canvas');clean.width=cropWidth;clean.height=cropHeight;
        const cleanContext=clean.getContext('2d'),cleanImage=cleanContext.createImageData(cropWidth,cropHeight);
        for(let y=0;y<cropHeight;y++)for(let x=0;x<cropWidth;x++){
          const sourceIndex=(component.minY+y)*width+component.minX+x;if(labels[sourceIndex]!==component.label)continue;
          const sourceOffset=sourceIndex*4,targetOffset=(y*cropWidth+x)*4;
          cleanImage.data[targetOffset]=pixels[sourceOffset];cleanImage.data[targetOffset+1]=pixels[sourceOffset+1];cleanImage.data[targetOffset+2]=pixels[sourceOffset+2];cleanImage.data[targetOffset+3]=pixels[sourceOffset+3];
        }
        cleanContext.putImageData(cleanImage,0,0);
        const drawWidth=cropWidth*scale,drawHeight=cropHeight*scale;
        cell.getContext('2d').drawImage(clean,(outputSize-drawWidth)/2,outputSize-padding-drawHeight,drawWidth,drawHeight);
      }
      const texture=new THREE.CanvasTexture(cell);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;cells.push(texture);
    }
    frames.push(cells);
  }
  return {frames,aspect:1};
}
function splitAtlas(THREE,canvas,def){
  if(def.isolateComponents)return componentFrames(THREE,canvas,def);
  const frames=[],cellWidth=canvas.width/def.columns,cellHeight=canvas.height/def.rows;
  for(let row=0;row<def.rows;row++){
    const cells=[];
    for(let column=0;column<def.columns;column++){
      const cell=document.createElement('canvas');cell.width=Math.ceil(cellWidth);cell.height=Math.ceil(cellHeight);
      const ctx=cell.getContext('2d'),rect=spriteCellRect(def,canvas.width,canvas.height,row,column);
      ctx.drawImage(canvas,rect.sourceX,rect.sourceY,rect.sourceWidth,rect.sourceHeight,0,0,cell.width,Math.ceil(rect.sourceHeight));
      const texture=new THREE.CanvasTexture(cell);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
      cells.push(texture);
    }
    frames.push(cells);
  }
  return {frames,aspect:cellWidth/cellHeight};
}
export async function loadSpriteLibrary(THREE){
  const loaded=await Promise.all(Object.entries(SPRITE_MANIFEST).filter(([,def])=>def.image).map(async ([key,def])=>{
    try{const image=await loadImage(def.image),atlas=splitAtlas(THREE,atlasCanvas(image,def.chromaKey),def);return [key,{...atlas,definition:def}];}
    catch(error){console.warn(`GOABLO sprite atlas fallback: ${key}`,error);return null;}
  }));
  const entries=loaded.filter(Boolean);return {ready:entries.length>0,...Object.fromEntries(entries)};
}
export function playerSpriteRow(classId){return SPRITE_MANIFEST.players.rowByClassId[classId]??0;}
export function monsterSpriteRow(id,index,boss=false){
  const exact=SPRITE_MANIFEST.monsters.rowByMonsterId[id];
  if(exact!==undefined)return exact;
  if(boss)return null;
  const rows=SPRITE_MANIFEST.monsters.normalRows;
  return rows[index%rows.length];
}
export function act1MonsterProfile(slot){const roster=SPRITE_MANIFEST.monsters.act1Roster;return roster[slot%roster.length];}
export function act1BossProfile(){return SPRITE_MANIFEST.monsters.act1Boss;}
export function act2MonsterProfile(slot){const roster=SPRITE_MANIFEST.act2Monsters.roster;return roster[slot%roster.length];}
export function act3MonsterProfile(slot){const roster=SPRITE_MANIFEST.act3Monsters.roster;return roster[slot%roster.length];}
export function act4MonsterProfile(slot){const roster=SPRITE_MANIFEST.act4Monsters.roster;return roster[slot%roster.length];}
export function createSpriteActor(THREE,library,{atlas,row,scale=1,boss=false,kind='human'}){
  const sheet=library?.[atlas],frames=sheet?.frames?.[row];if(!frames)return null;
  const group=new THREE.Group(),height=(atlas==='players'?2.75:boss?3.15:2.5)*scale;
  const material=new THREE.SpriteMaterial({map:frames[0],transparent:true,alphaTest:.08,depthWrite:false,toneMapped:true});
  const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.position.y=.1*scale;sprite.scale.set(height*sheet.aspect,height,1);sprite.renderOrder=2;group.add(sprite);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48*scale,20),new THREE.MeshBasicMaterial({color:'#050707',transparent:true,opacity:.42,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;group.add(shadow);
  const weapon=new THREE.Object3D();group.add(weapon);
  Object.assign(group.userData,{kind,head:sprite,legs:[],weapon,sprite,spriteAtlas:atlas,spriteRow:row,spriteFrames:frames,spriteMaterial:material,spriteFrame:-1,spriteState:'idle',spritePhase:Math.random()*10,labelHeight:height+.1*scale});
  return group;
}
export function animateSpriteActor(actor,state,time,phase=0){
  const data=actor?.userData,anim=SPRITE_MANIFEST.animations[state]||SPRITE_MANIFEST.animations.idle;
  if(!data?.spriteFrames)return;
  const frame=anim.frames[Math.floor((time+(data.spritePhase||phase))*anim.fps)%anim.frames.length];
  if(frame!==data.spriteFrame){data.spriteFrame=frame;data.spriteMaterial.map=data.spriteFrames[frame];data.spriteMaterial.needsUpdate=true;}
  data.spriteState=state;
}
