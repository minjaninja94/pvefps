const TARGET_GROUND_MODES=new Set([
 'arrowstorm','blizzard','bind','collapse','command','compress','extract','freeze','gravity','infect','judgment','meteor','paralyze','pillar','plague','pool','rain','rift','slowtime','thunder','trap','wall'
]);

const PROJECTILE_MODES=new Set([
 'beam','chain','drain','execute','explosive','fireball','flurryshot','frostshot','homing','overcharge','pierce','piercing','projectile','return','snipe','split','triple','wave'
]);

const MELEE_MODES=new Set([
 'assassinate','backstab','bladestorm','break','burst','cleave','cone','corrode','counter','flurry','launch','poisonblade','quake','release','shieldbash','slam','sweep'
]);

const NO_COMMON_CAST_MODES=new Set(['dash','blinkstrike','evade','exchange','teleport']);

export function skillVfxRoute(mode){
 if(TARGET_GROUND_MODES.has(mode))return 'target';
 if(PROJECTILE_MODES.has(mode))return 'projectile';
 if(MELEE_MODES.has(mode))return 'melee';
 if(NO_COMMON_CAST_MODES.has(mode))return 'none';
 return 'self';
}

export const SKILL_VFX_LIMITS=Object.freeze({transientEffects:190,dynamicLights:12,projectileLights:16});
