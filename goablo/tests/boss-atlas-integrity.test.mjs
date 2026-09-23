import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';

function decodePng(def){
  const bytes=fs.readFileSync(new URL('../'+def.image,import.meta.url));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const idat=[];let offset=8,ended=false;
  while(offset+12<=bytes.length){
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),end=offset+12+length;
    assert.ok(end<=bytes.length,`${def.image}: truncated ${type} chunk`);
    if(type==='IDAT')idat.push(bytes.subarray(offset+8,offset+8+length));
    if(type==='IEND'){ended=true;break;}
    offset=end;
  }
  assert.ok(ended,`${def.image}: missing IEND chunk`);
  assert.doesNotThrow(()=>inflateSync(Buffer.concat(idat)),`${def.image}: corrupt pixel stream`);
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

test('Act 1 and orphan king attack atlases decode into complete square cells',()=>{
  for(const key of ['bossAttacksB01B02','bossB12','bossB12Attacks']){
    const def=SPRITE_MANIFEST[key],{width,height}=decodePng(def);
    assert.equal(width,def.columns*256);
    assert.equal(height,def.rows*256);
  }
});
