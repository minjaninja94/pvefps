function buildWhiteJade() {
  const mesh=[], uv=[], skin=[], groups=[];
  let pass="body";
  const joint=(position,parent)=>({position,parent});
  const joints=[null,joint([0,1.94,0],0),joint([0,2.57,0],1),joint([0,3.19,0],2)];
  const palette={
    skin:[1,.90,.89], hair:[.93,.98,1], suit:[.95,1,.96], jade:[.64,.94,.78],
    eyes:[.12,.43,.35], ink:[.12,.17,.20], pearl:[1,1,1], lip:[.68,.34,.42],
    face:[1,1,1], helmet:[.23,.29,.33], rim:[.10,.15,.18], stripe:[1,.62,.19], lens:[.39,.82,.87]
  };
  const tile={skin:0,hair:1,suit:2,jade:3};
  function triangle(a,b,c,bone,material,shade=1) {
    const atlas=tile[material];
    const texture=pass==="face" ? 1 : atlas===undefined ? -1 : 0;
    let group=groups.at(-1);
    if (!group || group.texture!==texture || group.pass!==pass) {
      group={start:mesh.length/6,count:0,texture,pass};
      groups.push(group);
    }
    group.count+=3;
    for (const point of [a,b,c]) {
      mesh.push(point[0],point[1],point[2],...palette[material].map(value=>value*shade));
      if (texture===1) uv.push(point[3],point[4]);
      else uv.push(atlas===undefined ? 0 : (atlas%2)*.5+.045+point[3]*.40,
        atlas===undefined ? .04 : Math.floor(atlas/2)*.5+.045+point[4]*.40);
      skin.push(bone,0,0,0,1,0,0,0);
    }
  }
  function ellipsoid(center,radii,bone,material,segments=16,rings=10) {
    function vertex(row,col) {
      const lat=(row/rings-.5)*Math.PI, lon=col/segments*2*Math.PI;
      return [center[0]+radii[0]*Math.cos(lat)*Math.sin(lon),
        center[1]+radii[1]*Math.sin(lat),center[2]+radii[2]*Math.cos(lat)*Math.cos(lon),col/segments,1-row/rings];
    }
    for(let row=0;row<rings;row++) for(let col=0;col<segments;col++) {
      const shade=.76+.24*Math.max(0,.45-.33*Math.cos(col/segments*2*Math.PI)+row/rings*.47);
      const a=vertex(row,col),b=vertex(row,col+1),c=vertex(row+1,col+1),d=vertex(row+1,col);
      triangle(a,b,c,bone,material,shade);
      triangle(a,c,d,bone,material,shade);
    }
  }
  function section(start,end,radius,bone,material) {
    const delta=end.map((value,index)=>value-start[index]);
    const center=start.map((value,index)=>value+delta[index]/2);
    ellipsoid(center,[Math.abs(delta[0])*.50+radius,Math.abs(delta[1])*.50+radius,Math.abs(delta[2])*.50+radius],bone,material,12,8);
  }
  ellipsoid([0,1.94,0],[.46,.33,.29],1,"suit");
  ellipsoid([0,2.30,.025],[.36,.50,.24],2,"skin");
  ellipsoid([0,2.63,.018],[.52,.34,.27],2,"skin");
  // Opaque one-piece swimsuit and its two long diagonal panels.
  ellipsoid([0,2.10,-.035],[.34,.36,.235],1,"suit");
  ellipsoid([0,2.60,-.195],[.416,.223,.132],2,"suit");
  for(const side of [-1,1]) {
    const a=[side*.09,2.04,-.27,0,1], b=[side*.18,2.04,-.29,1,1];
    const c=[side*.48,2.79,-.18,1,0], d=[side*.285,2.83,-.26,0,0];
    triangle(a,b,c,2,"suit"); triangle(a,c,d,2,"suit");
    section([side*.35,2.74,-.04],[side*.35,2.86,.16],.045,2,"jade");
  }
  ellipsoid([0,2.91,.01],[.132,.25,.125],2,"skin");
  ellipsoid([0,3.28,.08],[.39,.49,.32],3,"hair");
  ellipsoid([0,3.26,-.112],[.326,.35,.225],3,"skin",28,18);
  ellipsoid([0,3.40,-.22],[.329,.149,.125],3,"hair");
  ellipsoid([-.23,3.38,-.103],[.13,.23,.159],3,"hair");
  ellipsoid([.24,3.41,-.07],[.14,.24,.16],3,"hair");
  pass="face";
  function faceVertex(col,row) {
    const u=col/24,v=row/24;
    const x=(u-.5)*.54,y=3.60-v*.61;
    const shape=1-(x/.326)**2-((y-3.26)/.35)**2;
    return [[x,y,-.112-.226*Math.sqrt(Math.max(0,shape))-.004,u,v],shape];
  }
  for(let row=0;row<24;row++) for(let col=0;col<24;col++) {
    const [a,b,c,d]=[faceVertex(col,row),faceVertex(col+1,row),faceVertex(col+1,row+1),faceVertex(col,row+1)];
    if (Math.min(a[1],b[1],c[1],d[1])<.20) continue;
    triangle(a[0],b[0],c[0],3,"face"); triangle(a[0],c[0],d[0],3,"face");
  }
  pass="faceFallback";
  ellipsoid([0,3.23,-.337],[.039,.044,.044],3,"skin",10,6);
  ellipsoid([0,3.10,-.318],[.060,.016,.012],3,"lip",10,6);
  for(const side of [-1,1]) {
    ellipsoid([side*.137,3.29,-.314],[.087,.044,.022],3,"ink",12,8);
    ellipsoid([side*.136,3.286,-.328],[.045,.036,.018],3,"eyes",12,8);
    ellipsoid([side*.128,3.300,-.343],[.015,.014,.009],3,"pearl",10,6);
  }
  pass="body";
  for(const side of [-1,1]) {
    ellipsoid([side*.32,3.20,-.075],[.042,.083,.044],3,"skin");
    ellipsoid([side*.327,3.132,-.097],[.033,.055,.027],3,"jade",10,6);
  }
  ellipsoid([.30,3.05,.22],[.18,.42,.18],3,"hair");
  ellipsoid([.31,3.21,.22],[.18,.045,.19],3,"jade");
  for(const side of [-1,1]) {
    const shoulder=[side*.43,2.72,.01], elbow=[side*.67,2.27,.015], wrist=[side*.75,1.87,-.04];
    const thigh=[side*.235,1.92,0], knee=[side*.235,1.12,-.02], ankle=[side*.235,.33,.04];
    const first=joints.length;
    joints.push(joint(shoulder,2),joint(elbow,first),joint(wrist,first+1),
      joint(thigh,1),joint(knee,first+3),joint(ankle,first+4));
    section(shoulder,elbow,.115,first,"skin");
    section(elbow,wrist,.098,first+1,"skin");
    ellipsoid([wrist[0],wrist[1]-.071,wrist[2]],[.096,.15,.073],first+2,"skin");
    ellipsoid([wrist[0],wrist[1]+.075,wrist[2]],[.114,.048,.108],first+1,"jade");
    section(thigh,knee,.16,first+3,"skin");
    section(knee,ankle,.105,first+4,"skin");
    ellipsoid([ankle[0],.19,-.095],[.12,.145,.245],first+5,"suit");
    ellipsoid([ankle[0],.245,-.07],[.123,.045,.218],first+5,"jade");
  }
  pass="helmet";
  // Cap, raised rim, side guards and the stripe each share the head joint.
  ellipsoid([0,3.69,.015],[.491,.285,.416],3,"helmet",22,14);
  ellipsoid([0,3.52,.005],[.513,.078,.431],3,"rim",22,8);
  ellipsoid([0,3.876,.012],[.081,.116,.341],3,"stripe",16,10);
  ellipsoid([0,3.558,-.408],[.251,.045,.028],3,"stripe",16,8);
  for(const side of [-1,1]) {
    ellipsoid([side*.421,3.395,.032],[.114,.203,.207],3,"helmet");
    ellipsoid([side*.511,3.423,.032],[.029,.085,.080],3,"stripe",12,8);
  }
  ellipsoid([0,3.50,-.427],[.147,.035,.024],3,"lens");
  return {mesh:new Float32Array(mesh),uv:new Float32Array(uv),skin:new Float32Array(skin),
    joints,groups,images:[]};
}
