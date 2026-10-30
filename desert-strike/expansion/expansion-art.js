/* Prepared strips: eight painted poses mapped onto the existing 16-frame action clock. */
(function(global){'use strict';
const X=global.DesertExpansion,cache=new Map();
const poses={idle:[0,1],move:[2,3],attack:[4,5],siege:[4,6],skill:[4,6],spawn:[0],hit:[5],death:[7]};
function pose(action,frame){const list=poses[action]||poses.idle,n=((Math.floor(frame)||0)%16+16)%16;return action==='idle'||action==='move'?list[Math.floor(n/2)%list.length]:list[Math.min(list.length-1,Math.floor(n/16*list.length))];}
function source(faction,role,skin){
 const name=X.FACTIONS[faction],moe=skin==='moe',modern=role===9||role===10;
 const url=modern?'./assets/'+(moe?'moe':'base')+'-'+name+'-'+(role===9?'sniper':'assassin')+'.webp':moe?'../assets/sprites/moe-'+name+'-actions.webp':'../assets/sprites/uniform-'+name+'-'+role+'.webp';
 if(!cache.has(url)){const im=new Image();im.decoding='async';cache.set(url,im);im.src=url;}
 return {image:cache.get(url),row:!modern&&moe?role:0};
}
function draw(g,{faction=0,role=9,skin='base',action='idle',frame=0,x=0,y=0,size=72,facing=1,opacity=1,filter='none'}={}){
 const {image,row}=source(faction,role,skin);if(!image.complete||!image.naturalWidth)return false;
 g.save();g.translate(x+size/2,y+size/2);g.scale(facing,1);g.globalAlpha=opacity;g.imageSmoothingEnabled=false;g.filter=filter;
 if(action==='death')g.globalAlpha*=1-((frame%16)/20);
 if(action==='spawn'){const scale=.5+.5*Math.min(1,frame/7);g.scale(scale,scale);}
 if(action==='hit')g.translate(-Math.sin(frame/15*Math.PI)*4,0);
 g.drawImage(image,pose(action,frame)*96,row*96,96,96,-size/2,-size/2,size,size);g.restore();return true;
}
global.DesertExpansionArt=Object.freeze({draw,pose,paintedPoses:8,frames:16,status:()=>({requested:cache.size,ready:[...cache.values()].filter(i=>i.complete&&i.naturalWidth>0).length})});
})(window);
