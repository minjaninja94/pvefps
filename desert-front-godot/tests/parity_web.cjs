require('../../desert-strike/tri-lane-engine.js');
const game=globalThis.DesertTriEngine.create({mode:'pvp',size:1,members:[{uid:'a',name:'A',team:0,faction:0},{uid:'b',name:'B',team:1,faction:0}]});
game.order('a',{type:'build',lane:0,slot:0,role:0});
game.order('b',{type:'build',lane:0,slot:0,role:0});
const result=[];
for(let step=0;step<=1000;step++){
  if([0,20,480,600,1000].includes(step)){
    const s=game.snapshot();
    result.push({step,wave:s.wave,next:s.next,cash:s.players.map(p=>p.cash),cores:s.cores,turrets:s.turrets,forwardHP:s.forwardHP,units:s.units.map(u=>({team:u.team,x:u.x,hp:u.hp,role:u.role}))});
  }
  if(step<1000)game.tick(.05);
}
console.log('PARITY_JSON='+JSON.stringify(result));
