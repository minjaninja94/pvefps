import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve('goablo');
const files = fs.readdirSync(root).filter(name => /^file_0000.*\.png$/i.test(name)).sort();
if (files.length !== 3) throw new Error(`Expected 3 sprite PNGs, found ${files.length}`);

function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
function decodePng(file){
  const buf=fs.readFileSync(file), sig=Buffer.from([137,80,78,71,13,10,26,10]);
  if(!buf.subarray(0,8).equals(sig)) throw new Error(`${file}: invalid PNG signature`);
  let offset=8, width, height, bitDepth, colorType, palette=null, transparency=null;
  const idat=[];
  while(offset<buf.length){
    const length=buf.readUInt32BE(offset), type=buf.toString('ascii',offset+4,offset+8);
    const data=buf.subarray(offset+8,offset+8+length);offset+=12+length;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];}
    else if(type==='PLTE') palette=data;
    else if(type==='tRNS') transparency=data;
    else if(type==='IDAT') idat.push(data);
    else if(type==='IEND') break;
  }
  if(bitDepth!==8) throw new Error(`${file}: unsupported bit depth ${bitDepth}`);
  const channels=({0:1,2:3,3:1,4:2,6:4})[colorType];
  if(!channels) throw new Error(`${file}: unsupported color type ${colorType}`);
  const stride=width*channels, raw=zlib.inflateSync(Buffer.concat(idat));
  const pixels=Buffer.alloc(width*height*channels);let src=0;
  for(let y=0;y<height;y++){
    const filter=raw[src++], row=y*stride, prev=row-stride;
    for(let x=0;x<stride;x++){
      const value=raw[src++], a=x>=channels?pixels[row+x-channels]:0, b=y?pixels[prev+x]:0, c=y&&x>=channels?pixels[prev+x-channels]:0;
      pixels[row+x]=(value+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):(()=>{throw new Error(`${file}: bad filter ${filter}`);})()))&255;
    }
  }
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0,j=0;i<width*height;i++,j+=channels){
    let r,g,b,a=255;
    if(colorType===6){r=pixels[j];g=pixels[j+1];b=pixels[j+2];a=pixels[j+3];}
    else if(colorType===2){r=pixels[j];g=pixels[j+1];b=pixels[j+2];}
    else if(colorType===3){const n=pixels[j];r=palette[n*3];g=palette[n*3+1];b=palette[n*3+2];a=transparency?.[n]??255;}
    else if(colorType===4){r=g=b=pixels[j];a=pixels[j+1];}
    else {r=g=b=pixels[j];}
    const o=i*4;rgba[o]=r;rgba[o+1]=g;rgba[o+2]=b;rgba[o+3]=a;
  }
  return {width,height,bitDepth,colorType,rgba,bytes:buf.length};
}
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,data])),8+data.length);return out;}
function encodeRgba(width,height,rgba){
  const rows=Buffer.alloc(height*(1+width*4));
  for(let y=0;y<height;y++){const at=y*(1+width*4);rows[at]=0;rgba.copy(rows,at+1,y*width*4,(y+1)*width*4);}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function preview(img,max=448){
  const scale=Math.min(1,max/Math.max(img.width,img.height)),width=Math.max(1,Math.round(img.width*scale)),height=Math.max(1,Math.round(img.height*scale));
  const out=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=Math.min(img.width-1,Math.floor(x/scale)),sy=Math.min(img.height-1,Math.floor(y/scale)),a=(sy*img.width+sx)*4,b=(y*width+x)*4;img.rgba.copy(out,b,a,a+4);}
  return encodeRgba(width,height,out);
}
function inspect(name,img){
  const colors=new Map();let transparent=0,magenta=0,samples=0;
  const step=Math.max(1,Math.floor(Math.sqrt(img.width*img.height/180000)));
  for(let y=0;y<img.height;y+=step)for(let x=0;x<img.width;x+=step){const i=(y*img.width+x)*4,r=img.rgba[i],g=img.rgba[i+1],b=img.rgba[i+2],a=img.rgba[i+3];samples++;if(a<16)transparent++;if(a>127&&r>190&&b>150&&g<120)magenta++;const key=`${r>>4},${g>>4},${b>>4},${a>>4}`;colors.set(key,(colors.get(key)||0)+1);}
  const dominant=[...colors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([bucket,count])=>({bucket,count,ratio:Number((count/samples).toFixed(4))}));
  const corner=[...img.rgba.subarray(0,4)];
  return {file:name,width:img.width,height:img.height,bytes:img.bytes,bitDepth:img.bitDepth,colorType:img.colorType,corner,transparentRatio:Number((transparent/samples).toFixed(4)),magentaRatio:Number((magenta/samples).toFixed(4)),dominant};
}
const report={generatedAt:new Date().toISOString(),node:process.version,files:[]};
for(const name of files){
  const img=decodePng(path.join(root,name));
  report.files.push(inspect(name,img));
  const data='data:image/png;base64,'+preview(img).toString('base64');
  fs.writeFileSync(path.join(root,`.sprite-preview-${name}.txt`),data);
}
fs.writeFileSync(path.join(root,'sprite-inspection.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
