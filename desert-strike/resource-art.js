(function(global){'use strict';
let image=null;
function draw(g,x,y,size){if(!image)return false;g.drawImage(image,x,y,size,size);return true;}
global.DesertResourceArt=Object.freeze({draw});
if(typeof Image!=='undefined'){const im=new Image();im.decoding='async';im.onload=()=>{image=im;global.dispatchEvent?.(new Event('desert-real-sprites-ready'));};im.src='./assets/resource-extractor.webp?v=economy4';}
})(window);
