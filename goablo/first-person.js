export function viewMovement(right,forward,yaw){
 const length=Math.max(1,Math.hypot(right,forward));
 return {x:(right*Math.cos(yaw)-forward*Math.sin(yaw))/length,z:(-right*Math.sin(yaw)-forward*Math.cos(yaw))/length};
}
export function aimDistance(pitch,height=1.65){return Math.max(2,Math.min(24,height/Math.max(.07,-Math.sin(pitch))));}
