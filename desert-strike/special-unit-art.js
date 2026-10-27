/* Dedicated vehicles, cavalry and human support retain their original artwork,
   now packed into isolated strips so neighboring atlas rows cannot leak in. */
(function(global){'use strict';
const ROWS={'3-6':0,'4-6':1,'6-6':2,'7-6':3,'3-7':4};
function frame(f,r,action,n){return ROWS[f+'-'+r]===undefined?null:global.DesertRealSprites?.frame(f,r,action,n)||null;}
function draw(g,f,r,a,n){const cv=frame(f,r,a,n);if(!cv)return false;g.drawImage(cv,0,0);return true;}
global.DesertSpecialArt=Object.freeze({frame,draw,isSpecial:(f,r)=>ROWS[f+'-'+r]!==undefined});
})(window);
