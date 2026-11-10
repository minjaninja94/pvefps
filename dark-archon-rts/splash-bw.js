/* Signature splash patterns for Brood War combat units.
 * Uses base attacks and damage types from the game; does not alter their stats.
 */
(() => {
 const originalImpact=applyImpact;
 const multiplier=(r,a)=>r<=a[0]?1:r<=a[1]?.5:r<=a[2]?.25:0;
 function ring(source,target,amount,radii,allowAir){
  const center={x:target.x,y:target.y};
  if(target.core)damage(target,amount,source,'normal');
  for(const victim of units){
   if(victim.hp<=0||!hostileFor(source,victim)||(!allowAir&&TYPES[victim.type].flying))continue;
   const share=victim===target?1:multiplier(distance(victim,center),radii);
   if(share)damage(victim,amount*share,source,'normal');
  }
  effects.push({x:center.x,y:center.y,color:allowAir?'#b7a0ff':'#ffc78e',r:radii[2]*1.45,ttl:.4,total:.4});
 }
 function flame(source,target){
  const x=target.x-source.x,y=target.y-source.y,len=Math.max(.001,Math.hypot(x,y));
  const dx=x/len,dy=y/len,reach=Math.max(43,Math.min(TYPES.firebat.range+20,len+18));
  const tip={x:source.x+dx*reach,y:source.y+dy*reach};
  if(target.core)damage(target,16,source,'concussive');
  for(const v of units){
   if(v.hp<=0||!hostileFor(source,v)||TYPES[v.type].flying)continue;
   const along=(v.x-source.x)*dx+(v.y-source.y)*dy;
   const across=(v.x-source.x)*dy-(v.y-source.y)*dx;
   if(along<0||along>reach+12)continue;
   const width=11+TYPES[v.type].r*.14;
   let hits=0;
   if(Math.abs(across-8)<width){damage(v,8,source,'concussive');hits++}
   if(Math.abs(across+8)<width){damage(v,8,source,'concussive');hits++}
   if(hits<2){const share=multiplier(distance(v,tip),[15,20,25]);if(share)damage(v,8*share,source,'concussive')}
  }
  for(let i=1;i<=3;i++)effects.push({x:source.x+dx*(i*reach/3),y:source.y+dy*(i*reach/3),r:16,color:'#ff9a43',ttl:.3,total:.3});
 }
 function spines(source,target,amount){
  const x=target.x-source.x,y=target.y-source.y,len=Math.max(1,Math.hypot(x,y)),dx=x/len,dy=y/len;
  const reach=TYPES.lurker.range+12;
  if(target.core)damage(target,amount,source,'normal');
  for(const v of units){
   if(v.hp<=0||!hostileFor(source,v)||TYPES[v.type].flying)continue;
   const along=(v.x-source.x)*dx+(v.y-source.y)*dy;
   const side=Math.abs((v.x-source.x)*dy-(v.y-source.y)*dx);
   if(along>=0&&along<=reach+TYPES[v.type].r*.2&&side<=13+TYPES[v.type].r*.4)
    damage(v,amount,source,'normal');
  }
  for(let p=24;p<=reach;p+=28)effects.push({x:source.x+dx*p,y:source.y+dy*p,r:14,color:'#bf88d4',ttl:.32,total:.32});
 }
 applyImpact=function(source,target,amount,weapon='normal',splash=0,bounce=false,pierce=false){
  if(!source)return originalImpact(source,target,amount,weapon,splash,bounce,pierce);
  switch(source.type){
   case 'firebat':flame(source,target);return;
   case 'reaver':ring(source,target,amount,[20,40,60],false);return;
   case 'archon':ring(source,target,amount,[3,15,30],true);return;
   case 'lurker':spines(source,target,amount);return;
   default:return originalImpact(source,target,amount,weapon,splash,bounce,pierce);
  }
 };
})();
