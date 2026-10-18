// Run: node tests/rhythm-weapon-clash.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../rhythm');
const context={window:{},setTimeout(){}};
for(const src of ['combat-fx.js','battle-system.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,src),'utf8'),context,{filename:src});
const {NeonCombatFX:fx,RhythmClash:rules}=context.window;
assert.ok(fx.CLASH_DURATION>1.3);
const approach=fx.clashMotion(.16),lock=fx.clashMotion(.55),retreat=fx.clashMotion(1.24);
assert.equal(approach.active,true);
assert.ok(lock.advance>approach.advance,'Fighters must move closer to each other');
assert.ok(lock.advance>retreat.advance,'Both fighters retreat after the weapon lock');
assert.ok(lock.contact>.8&&lock.lock>.9,'Central crossed weapons need a visible hold');
assert.equal(fx.clashMotion(2).active,false);
assert.equal(fx.clashMotion(.6,true).shake,0,'Reduced motion must disable shake');
let strokes=0,blades=0,orbs=0;
const canvas=new Proxy({
 save(){},restore(){},beginPath(){},moveTo(){},lineTo(){blades++},stroke(){strokes++},
 fill(){orbs++},arc(){},ellipse(){},translate(){},closePath(){},quadraticCurveTo(){}
},{get(target,key){return key in target?target[key]:()=>{}},set(target,key,val){target[key]=val;return true}});
fx.drawClash(canvas,.55,'blade','claw');
assert.ok(strokes>=8&&blades>=7,'Draw must show both combatants clashing weapons');
const before=strokes;
fx.drawClash(canvas,.1,'blade','spell');
assert.equal(strokes,before,'No premature weapon collision before impact');
fx.drawClash(canvas,.6,'spell','spell',true);
assert.ok(strokes>before,'Reduced motion must still render a visible duel');
const notes=[];for(let phrase=0;phrase<2;phrase++)for(let i=0;i<4;i++)notes.push({id:notes.length,side:phrase?'player':'bot',phrase,t:phrase*4+i*.5,lane:i});
const game=rules.make(notes);
for(const n of notes)rules.register(game,n.side,n.id,'perfect');
const result=rules.resolve(game,0);
assert.equal(result.winner,'draw');
assert.equal(result.damage,0);
assert.equal(game.hp.player,100);
assert.equal(game.hp.bot,100);
const mirrored=rules.make(notes.map(n=>({...n,side:n.side==='player'?'bot':'player'})));
const guest=rules.applyRemote(mirrored,result);
assert.equal(guest.winner,'draw');
assert.equal(guest.hp.player,100);
assert.equal(guest.hp.bot,100);
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
assert.match(source,/window\.NeonCombatFX\.drawClash\(g,age,fighterP\.weapon,fighterB\.weapon,reduced\)/);
assert.match(source,/window\.NeonCombatFX\.clashSound\(audio,options\.sfx\)/);
assert.match(source,/const finalClash=!fail&&winner==='draw'/);
assert.match(source,/finalClash\?window\.NeonCombatFX\.CLASH_DURATION\*1000/);
console.log('Weapon clash PASS: tie has no damage, symmetric lunge/lock/retreat, effects, online mirroring, final draw');
