#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const outputDir=path.resolve(import.meta.dirname,'../assets/audio/loot'),rate=44100;
fs.mkdirSync(outputDir,{recursive:true});
const clamp=value=>Math.max(-1,Math.min(1,value));
function random(seed){let state=seed>>>0;return()=>((state=(state*1664525+1013904223)>>>0)/4294967296)*2-1;}
function writeWav(file,left,right){const frames=left.length,channels=2,buffer=Buffer.alloc(44+frames*channels*2);buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(channels,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*channels*2,28);buffer.writeUInt16LE(channels*2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(frames*channels*2,40);let offset=44;for(let i=0;i<frames;i++)for(const sample of [left[i],right[i]]){buffer.writeInt16LE(Math.round(clamp(sample)*32767),offset);offset+=2;}fs.writeFileSync(file,buffer);}

const tiers=[
 {duration:.62,notes:[1568],body:.12,sparkle:.025,delay:.10},
 {duration:.78,notes:[1760,1318.5],body:.15,sparkle:.030,delay:.12},
 {duration:1.02,notes:[1975.5,1480,1174.7],body:.18,sparkle:.036,delay:.15},
 {duration:1.42,notes:[2349.3,1760,1396.9],body:.23,sparkle:.044,delay:.19},
 {duration:1.78,notes:[2637,1975.5,1568,1174.7],body:.28,sparkle:.052,delay:.23},
 {duration:2.18,notes:[3136,2349.3,1760,1396.9,1046.5],body:.34,sparkle:.060,delay:.27}
];

function makeChime(spec,tier){
 const frames=Math.ceil(spec.duration*rate),left=new Float64Array(frames),right=new Float64Array(frames),noise=random(4200+tier*733),partials=[[1,1],[2.006,.42],[2.996,.24],[4.12,.13],[5.43,.07]];
 spec.notes.forEach((frequency,noteIndex)=>{
  const start=noteIndex*(tier>=3?.085:.07),pan=(noteIndex%2?1:-1)*(.12+tier*.035),gain=1-noteIndex*.105;
  for(let i=Math.floor(start*rate);i<frames;i++){
   const t=i/rate-start,attack=Math.min(1,t/.004),decay=Math.exp(-t*(3.9-tier*.23)),fall=1-.14*Math.min(1,t/.42),shimmer=1+.0018*Math.sin(2*Math.PI*(5.2+noteIndex)*t),base=frequency*fall*shimmer;
   let sample=0;for(const [multiple,level] of partials)sample+=Math.sin(2*Math.PI*base*multiple*t+noteIndex*.7)*level*Math.exp(-t*multiple*.52);
   const body=Math.sin(2*Math.PI*base*.5*t)*spec.body*Math.exp(-t*3.1),strike=noise()*spec.sparkle*Math.exp(-t*62),value=(sample*.25+body+strike)*attack*decay*gain;
   left[i]+=value*(1-pan*.45);right[i]+=value*(1+pan*.45);
  }
 });
 const delaySamples=Math.floor(spec.delay*rate),feedback=.22+tier*.025;for(let i=delaySamples;i<frames;i++){left[i]+=right[i-delaySamples]*feedback;right[i]+=left[i-delaySamples]*feedback*.92;}
 let peak=0;for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));const scale=.88/(peak||1);for(let i=0;i<frames;i++){const fade=Math.min(1,(frames-i)/(rate*.055));left[i]=Math.tanh(left[i]*scale*1.15)*.86*fade;right[i]=Math.tanh(right[i]*scale*1.15)*.86*fade;}
 return [left,right];
}

tiers.forEach((spec,index)=>{const [left,right]=makeChime(spec,index);writeWav(path.join(outputDir,`drop-${index}.wav`),left,right);});
console.log(`Generated ${tiers.length} stereo loot chimes in ${outputDir}`);
