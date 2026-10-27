/* Ten commander covers assembled from the actual in-game sprites. */
(function(global){'use strict';
const PAL=[
 ['#8de2fa','#2b5062','#56899d'],['#afd980','#344a33','#6b9368'],['#dec6ff','#483b68','#8975a8'],
 ['#eab186','#513e3c','#8b654c'],['#e9b0b4','#684854','#ad7e77'],['#b4f0d1','#365c53','#73aa8f'],
 ['#e5c18f','#614d42','#a08567'],['#a3e3ff','#2a4d68','#6d92b0'],['#cba4fd','#46335f','#8161a4'],
 ['#ffaed8','#654260','#b985a7']
];
function box(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
function tri(g,coords,color){g.fillStyle=color;g.beginPath();g.moveTo(coords[0][0],coords[0][1]);for(let i=1;i<coords.length;i++)g.lineTo(coords[i][0],coords[i][1]);g.closePath();g.fill();}
function base(g,f,p){
 const [light,dark,mid]=p;
 if(f===1||f===8){
  for(let k=0;k<7;k++){const x=83+k*24;tri(g,[[x-16,141],[x-2,62+k%3*8],[x+17,141]],k%2?dark:mid);}
  g.fillStyle=dark;g.beginPath();g.ellipse(162,119,71,36,0,0,Math.PI*2);g.fill();
  g.fillStyle=mid;g.beginPath();g.ellipse(162,106,54,27,0,0,Math.PI*2);g.fill();
  for(let k=0;k<5;k++)box(g,111+21*k,97+(k%2)*6,8,8,light);
 }else if(f===4||f===6){
  tri(g,[[72,141],[93,99],[156,72],[220,95],[251,141]],dark);
  tri(g,[[83,138],[112,106],[156,84],[219,117],[236,138]],mid);
  for(const x of [96,215]){box(g,x,87,10,52,dark);tri(g,[[x-9,90],[x+5,67],[x+20,90]],light);}
  box(g,140,107,32,33,light);
 }else if(f===5||f===9||f===2){
  for(const x of [100,159,216]){
   tri(g,[[x-18,139],[x-9,91],[x,49],[x+12,91],[x+19,139]],dark);
   tri(g,[[x-11,92],[x,56],[x+12,92]],light);
  }
  box(g,111,112,104,29,mid);box(g,147,110,30,30,dark);
 }else{
  box(g,93,77,135,65,dark);box(g,103,89,116,51,mid);
  for(const x of [99,214]){box(g,x-9,94,20,46,dark);box(g,x-11,89,24,8,light);}
  box(g,144,110,32,30,dark);box(g,150,116,20,24,light);
  if(f===3){box(g,153,62,5,38,'#dec2ad');box(g,158,67,27,17,'#bf514a');}
  if(f===7){box(g,134,82,47,13,'#7ac9e5');box(g,141,86,33,6,'#193b58');}
 }
}
function draw(canvas,f,skin='default'){
 const g=canvas?.getContext?.('2d');if(!g)return;
 const w=canvas.width,h=canvas.height,p=PAL[f]||PAL[0],old=g.imageSmoothingEnabled;
 if(global.DesertRealSprites?.cover?.(g,f,0,0,w,h,false)){global.DesertRealSprites.cover(g,f,w*.60,0,w*.40,h,true);return;}
 g.save();g.clearRect(0,0,w,h);g.scale(w/320,h/210);g.imageSmoothingEnabled=false;
 const bg=g.createLinearGradient(0,0,0,210);bg.addColorStop(0,'#122337');bg.addColorStop(.75,p[1]);bg.addColorStop(1,'#0d2535');g.fillStyle=bg;g.fillRect(0,0,320,210);
 for(let i=0;i<29;i++)box(g,(i*61+f*13)%313,(i*41+f*7)%87,2+(i%2),2,i%3?p[2]:p[0]);
 tri(g,[[0,144],[51,128],[99,139],[155,130],[214,143],[274,128],[320,143],[320,210],[0,210]],'#203a42');
 base(g,f,p);
 box(g,0,145,320,65,'#1b3440');
 for(let i=0;i<16;i++)box(g,i*22,147+(i%3)*13,18,2,'#506879');
 const unit=(role,x,y,size)=>{
  const model=skin==='moe'&&global.DesertMoeArt?.frame?.(f,role,'idle',5)||global.IsoWorld?.frame?.(f,role,'idle',5);
  if(model){g.fillStyle='#08141c99';g.beginPath();g.ellipse(x,y-13,size*.24,size*.06,0,0,Math.PI*2);g.fill();
   g.drawImage(model,0,0,72,72,x-size/2,y-size,size,size);}
 };
 unit(0,69,206,76);unit(3,251,206,76);unit(6,160,204,102);
 box(g,0,206,320,4,p[0]);g.restore();g.imageSmoothingEnabled=old;
}
global.DesertCommanderCovers=Object.freeze({draw});
})(window);