/* Local display IDs are separate from authenticated Supabase user IDs. */
(function(global){'use strict';
const KEY='desert-device-account-v1';
let record=null,pending=null,server=null;
function id(prefix){const bytes=new Uint8Array(12);global.crypto.getRandomValues(bytes);return prefix+'-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function read(){if(record)return record;try{const r=JSON.parse(global.localStorage.getItem(KEY)||'null');if(/^U-[a-f0-9]{24}$/.test(r?.accountId)&&/^D-[a-f0-9]{24}$/.test(r?.deviceId)){record=r;return r;}}catch(_){}
 record={version:1,accountId:id('U'),deviceId:id('D'),createdAt:Date.now()};
 try{global.localStorage.setItem(KEY,JSON.stringify(record));record.persistent=true;}catch(_){record.persistent=false;}return record;}
async function identity(){
 if(pending)return pending;
 pending=(async()=>{
  const local=read();
  const shared=await global.DesertSupabaseRooms.identity();
  server={...shared,accountId:local.accountId,deviceId:local.deviceId};
  return server;
 })().finally(()=>{pending=null;});
 return pending;
}
function status(){const r=read();return {accountId:r.accountId,deviceId:r.deviceId,persistent:r.persistent!==false,online:!!server};}
global.DesertDeviceAccount=Object.freeze({identity,status});
})(window);
