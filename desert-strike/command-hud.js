/* One persistent command stack; upgrades float below it without pausing combat. */
(function(global){'use strict';
const $=id=>document.getElementById(id);let previousFocus=null;
function measure(){const hud=$('commandHud');if(hud)document.documentElement.style.setProperty('--command-hud-height',Math.ceil(hud.getBoundingClientRect().height)+'px');}
function closeUpgrades(){const panel=$('upgradePanel');if(!panel||panel.hidden)return;panel.hidden=true;previousFocus?.focus?.();previousFocus=null;}
function openUpgrades(){if(document.body.dataset.playMode==='multi')return;const panel=$('upgradePanel');if(!panel)return;previousFocus=document.activeElement;measure();panel.hidden=false;$('closeUpgrades')?.focus();}
function init(){
 document.querySelectorAll('[data-open-upgrades]').forEach(b=>b.addEventListener('click',openUpgrades));
 $('closeUpgrades')?.addEventListener('click',closeUpgrades);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('upgradePanel').hidden){e.preventDefault();closeUpgrades();}});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(measure).observe($('commandHud'));
 global.addEventListener('resize',measure);measure();
}
global.DesertCommandHud=Object.freeze({openUpgrades,closeUpgrades,measure});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
