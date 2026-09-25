export const START_MENU_MUSIC='assets/audio/music/Cold_Weight_in_the_Hallway.mp3';

export const ACT_MUSIC_TRACKS=Object.freeze([
 'assets/audio/music/act1-plague-catacombs.mp3',
 'assets/audio/music/act2-burning-prison.mp3',
 'assets/audio/music/act3-bone-throne.mp3',
 'assets/audio/music/act4-fallen-cathedral.mp3',
 'assets/audio/music/act5-orphan-kingdom.mp3'
]);

export function musicTrackForAct(act){return ACT_MUSIC_TRACKS[Math.max(0,(Number(act)||1)-1)%ACT_MUSIC_TRACKS.length];}
