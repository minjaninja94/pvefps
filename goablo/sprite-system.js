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
function splitAtlas(THREE,canvas,def){
  const frames=[],cellWidth=canvas.width/def.columns,cellHeight=canvas.height/def.rows;
  for(let row=0;row<def.rows;row++){
    const cells=[];
    for(let column=0;column<def.columns;column++){
      const cell=document.createElement('canvas');cell.width=Math.ceil(cellWidth);cell.height=Math.ceil(cellHeight);
      const ctx=cell.getContext('2d');
      ctx.drawImage(canvas,column*cellWidth,row*cellHeight,cellWidth,cellHeight,0,0,cell.width,cell.height);
      const texture=new THREE.CanvasTexture(cell);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
      cells.push(texture);
    }
    frames.push(cells);
  }
  return {frames,aspect:cellWidth/cellHeight};
}
export async function loadSpriteLibrary(THREE){
  const entries=await Promise.all(['players','monsters'].map(async key=>{
    const def=SPRITE_MANIFEST[key],image=await loadImage(def.image),atlas=splitAtlas(THREE,atlasCanvas(image,def.chromaKey),def);
    return [key,{...atlas,definition:def}];
  }));
  return {ready:true,...Object.fromEntries(entries)};
}
export function playerSpriteRow(classId){return SPRITE_MANIFEST.players.rowByClassId[classId]??0;}
export function monsterSpriteRow(id,index,boss=false){
  const exact=SPRITE_MANIFEST.monsters.rowByMonsterId[id];
  if(exact!==undefined)return exact;
  if(boss)return null;
  const rows=SPRITE_MANIFEST.monsters.normalRows;
  return rows[index%rows.length];
}
export function createSpriteActor(THREE,library,{atlas,row,scale=1,boss=false,kind='human'}){
  const sheet=library?.[atlas],frames=sheet?.frames?.[row];if(!frames)return null;
  const group=new THREE.Group(),height=(atlas==='players'?2.75:boss?3.15:2.5)*scale;
  const material=new THREE.SpriteMaterial({map:frames[0],transparent:true,alphaTest:.08,depthWrite:true,toneMapped:true});
  const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.scale.set(height*sheet.aspect,height,1);sprite.renderOrder=2;group.add(sprite);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48*scale,20),new THREE.MeshBasicMaterial({color:'#050707',transparent:true,opacity:.42,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;group.add(shadow);
  const weapon=new THREE.Object3D();group.add(weapon);
  Object.assign(group.userData,{kind,head:sprite,legs:[],weapon,sprite,spriteFrames:frames,spriteMaterial:material,spriteFrame:-1,spriteState:'idle',spritePhase:Math.random()*10});
  return group;
}
export function animateSpriteActor(actor,state,time,phase=0){
  const data=actor?.userData,anim=SPRITE_MANIFEST.animations[state]||SPRITE_MANIFEST.animations.idle;
  if(!data?.spriteFrames)return;
  const frame=anim.frames[Math.floor((time+(data.spritePhase||phase))*anim.fps)%anim.frames.length];
  if(frame!==data.spriteFrame){data.spriteFrame=frame;data.spriteMaterial.map=data.spriteFrames[frame];data.spriteMaterial.needsUpdate=true;}
  data.spriteState=state;
}
