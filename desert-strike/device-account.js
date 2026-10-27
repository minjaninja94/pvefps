/* Public IDs identify an account/device. Firebase's persisted credential authenticates it. */
(function(global){'use strict';
const SDK='https://www.gstatic.com/firebasejs/12.18.0/',KEY='desert-device-account-v1';
let record=null,pending=null,server=null,authSDK=null;
function id(prefix){const bytes=new Uint8Array(12);global.crypto.getRandomValues(bytes);return prefix+'-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function read(){if(record)return record;try{const r=JSON.parse(global.localStorage.getItem(KEY)||'null');if(/^U-[a-f0-9]{24}$/.test(r?.accountId)&&/^D-[a-f0-9]{24}$/.test(r?.deviceId)){record=r;return r;}}catch(_){}
 record={version:1,accountId:id('U'),deviceId:id('D'),createdAt:Date.now()};
 try{global.localStorage.setItem(KEY,JSON.stringify(record));record.persistent=true;}catch(_){record.persistent=false;}return record;}
async function identity(){
 if(server&&authSDK){const auth=authSDK.getAuth(server.app);await auth.authStateReady();if(auth.currentUser?.uid===server.uid)return server;pending=null;server=null;}
 if(pending)return pending;
 pending=(async()=>{
  const local=read();if(!global.IronFirebase)throw Error('온라인 연결 모듈이 준비되지 않았습니다.');
  const shared=await global.IronFirebase.ready(),sdk=global.DesertDeviceAuthSDK||await import(SDK+'firebase-auth.js');
  authSDK=sdk;const auth=sdk.getAuth(shared.app);await sdk.setPersistence(auth,sdk.browserLocalPersistence);await auth.authStateReady();
  const user=auth.currentUser||(await sdk.signInAnonymously(auth)).user;
  if(!user?.uid)throw Error('기기 인증을 완료하지 못했습니다.');
  // A typed/public account ID is never accepted in place of the authenticated UID.
  server={...shared,uid:user.uid,accountId:local.accountId,deviceId:local.deviceId};return server;
 })().catch(e=>{pending=null;throw e;});return pending;
}
function status(){const r=read();return {accountId:r.accountId,deviceId:r.deviceId,persistent:r.persistent!==false,online:!!server};}
global.DesertDeviceAccount=Object.freeze({identity,status});
})(window);
