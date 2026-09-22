const ITEM_ROWS=Object.freeze({무기:0,보조무기:1,투구:2,갑옷:3,장갑:4,바지:5,신발:5,목걸이:6,반지:7,반지1:7,반지2:7});
const RARITY_COLORS=Object.freeze({일반:'#9aa5a0',마법:'#67a9d6',희귀:'#d9cf72',전설:'#e7a84b','세트 전설':'#75c977',유니크:'#b878e6',부모급:'#e56767'});

export function stableIconHash(value){let hash=2166136261;for(const char of String(value||'')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
export function itemIconCell(item){const hash=stableIconHash(item?.id||item?.uid||item?.name),row=ITEM_ROWS[item?.slot]??7;return {atlas:'itemIcons',image:'assets/sprites/item-icons-atlas.png',row,column:hash%8,rotation:(hash>>>3)%8*45,hue:(hash>>>8)%61-30};}
export function skillIconCell(db,skill){const specIndex=Math.max(0,db.specs.findIndex(spec=>spec.id===skill?.specializationId)),skills=db.skills.filter(entry=>entry.specializationId===skill?.specializationId),column=Math.max(0,Math.min(6,skills.findIndex(entry=>entry.id===skill?.id)));return {atlas:'skillIcons'+(Math.floor(specIndex/8)+1),image:`assets/sprites/skill-icons-${Math.floor(specIndex/8)+1}.png`,row:specIndex%8,column};}
export function specIconCell(db,spec){const index=Math.max(0,db.specs.findIndex(entry=>entry.id===spec?.id));return {atlas:'skillIcons'+(Math.floor(index/8)+1),image:`assets/sprites/skill-icons-${Math.floor(index/8)+1}.png`,row:index%8,column:7};}
export function iconStyle(cell,{rotate=false}={}){const x=cell.column/7*100,y=cell.row/7*100,rotation=rotate?cell.rotation||0:0,hue=rotate?cell.hue||0:0;return `background-image:url('${cell.image}');background-position:${x}% ${y}%;transform:rotate(${rotation}deg);filter:hue-rotate(${hue}deg)`;}
export function rarityColor(rarity){return RARITY_COLORS[rarity]||RARITY_COLORS.일반;}
