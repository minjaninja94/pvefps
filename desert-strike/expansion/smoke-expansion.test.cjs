'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const X=require('./expansion-rules.js'),R=require('./skin-rewards.js'),{create}=require('./combat-model.js'),catalogue=require('./base-roster.json');
const unit=(role,side,x,y=0)=>({id:role+side*100,role,side,x,y,hp:100,phase:'normal'});
test('live expansion preserves extractor slot 8 and activates specialist roster',()=>{
 assert.equal(X.EXTRACTOR,8);assert.equal(X.SNIPER,9);assert.equal(X.ASSASSIN,10);assert.equal(X.liveEnabled,true);
 for(let f=0;f<10;f++){assert.equal(X.definition(9,f).cost,380);assert.equal(X.definition(10,f).cost,330);assert.ok(X.definition(10,f).hp<catalogue.definitions[f][1].hp*.6);}
});
test('an undetected assassin remains visible in every client snapshot but cannot be directly targeted',()=>{
 const assassin=unit(10,1,200),rifle=unit(1,0,100),units=[assassin,rifle];
 assert.equal(X.canTarget(rifle,assassin,units,0),false);
 const snap=X.snapshot(assassin,units,0);assert.equal(snap.visible,true);assert.equal(snap.label,'은신!');assert.ok(snap.opacity>=.5);assert.equal(snap.x,200);
});
test('support detects within 190 and stops detecting after death or leaving range',()=>{
 const assassin=unit(10,1,200),support=unit(7,0,10),rifle=unit(1,0,0),units=[assassin,support,rifle];
 assert.equal(X.canTarget(rifle,assassin,units),true);assert.equal(X.presentation(support,units).label,'디텍팅!');assert.equal(X.presentation(support,units).detectionRadius,190);
 support.x=9;assert.equal(X.detected(assassin,units),false);support.x=10;support.hp=0;assert.equal(X.detected(assassin,units),false);
});
test('attacking gives nearby melee guards a real retaliation window',()=>{
 const assassin=unit(10,1,100),guard=unit(0,0,90),units=[assassin,guard];
 X.revealOnAttack(assassin,2);assert.equal(X.canTarget(guard,assassin,units,2.5),true);assert.equal(X.canTarget(guard,assassin,units,3.1),false);
});
test('infiltration is bounded, telegraphed, delayed and usable once per produced unit',()=>{
 const assassin={...unit(10,0,300),id:1},foes=[unit(0,1,500),unit(9,1,690)];
 const tr=X.infiltration(assassin,foes,0);assert.ok(tr);assert.ok(Math.hypot(tr.to.x-300,tr.to.y)<=380.001);assert.ok(tr.readyAt>tr.landAt);
 assassin.infiltrationUsed=true;assert.equal(X.infiltration(assassin,foes,1),null);
});
test('both armies pay the recorded CR and finish deterministic sample battles',()=>{
 const input={catalogue,factions:[0,0],patterns:[[10],[9]],budget:2400,seed:17};
 const a=create(input),b=create(input);for(const battle of [a,b])while(!battle.finished)battle.tick(.05);
 assert.deepEqual(a.result,b.result);for(const spent of a.spent)assert.ok(spent<=2400);assert.ok(a.metrics.infiltrations[0]>0);
});
test('reward preparation never grants from unverified local counters or changes combat stats',()=>{
 assert.equal(R.liveEnabled,false);assert.equal(R.eligible('night-vanguard',{completedOnlineMatches:1000,verifiedPvPWins:1000}),false);
 assert.equal(R.eligible('night-vanguard',{serverVerified:true,completedOnlineMatches:10,verifiedPvPWins:10}),true);
 assert.equal(R.eligible('platinum-veteran',{serverVerified:true,completedOnlineMatches:50,verifiedPvPWins:29}),false);
 assert.ok(R.SKINS.every(s=>!('damage' in s)&&!('hp' in s)));
});

test('precision helps armored specialists without giving a 20x hero damage shortcut',()=>{
 assert.equal(X.precisionMultiplier({role:9},{role:3,kind:'ground'}),1.6);
 assert.equal(X.precisionMultiplier({role:9},{role:1,kind:'ground'}),1);
 assert.equal(X.precisionMultiplier({role:9},{role:1,heroCount:20,kind:'ground'}),1.25);
 assert.equal(X.precisionMultiplier({role:9},{role:6,kind:'air'}),1);
});
test('detection can target an infiltrator during travel and attack exposure is clearly labelled',()=>{
 const assassin={...unit(10,1,100),phase:'infiltrating'},support=unit(7,0,0);
 assert.equal(X.canTarget(support,assassin,[support,assassin],0),true);
 X.revealOnAttack(assassin,1);assert.equal(X.presentation(assassin,[assassin],1.1).label,'공격 노출!');
});
test('all 40 delivered strips match their recorded hashes and contain eight distinct poses',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const manifest=require('./asset-manifest.json');assert.equal(manifest.generated,40);assert.equal(manifest.assets.filter(a=>a.skin==='base').length,20);assert.equal(manifest.assets.filter(a=>a.skin==='moe').length,20);
 for(const a of manifest.assets){const data=fs.readFileSync(path.join(__dirname,a.file));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256);assert.equal(a.paintedPoses,8);assert.equal(a.uniquePoseCount,8);}
 assert.equal(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').includes('expansion-rules.js'),true);
});
test('the shipped combat engine probe maintains paid specialist production and source integrity',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),file=path.join(__dirname,'../game-v2.js');
 const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');const before=hash();
 const {run}=require('./production-probe.cjs');const a=run({patterns:[[10],[9]],budget:2400});const b=run({patterns:[[10],[0,0,7,9]],budget:2400});
 for(const result of [a,b]){assert.ok(['0','1','draw','timeout',0,1].includes(result.winner));assert.ok(result.spent.every(n=>n<=2400));assert.equal(result.patterns.length,2);}assert.equal(hash(),before);
});
