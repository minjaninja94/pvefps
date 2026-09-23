export const ACT_MUSIC_TRACKS=Object.freeze([
 'assets/audio/music/act1-plague-catacombs.ogg',
 'assets/audio/music/act2-burning-prison.ogg',
 'assets/audio/music/act3-bone-throne.ogg',
 'assets/audio/music/act4-fallen-cathedral.ogg',
 'assets/audio/music/act5-orphan-kingdom.ogg'
]);

export function musicTrackForAct(act){return ACT_MUSIC_TRACKS[Math.max(0,(Number(act)||1)-1)%ACT_MUSIC_TRACKS.length];}
