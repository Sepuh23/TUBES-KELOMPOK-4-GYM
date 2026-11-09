/* game.js: dunia 3D, mobil, pemain, balapan, HUD, jaringan (layar laptop). Butuh three.js + physics.js */
const $=id=>document.getElementById(id),D2R=Math.PI/180,rnd=Math.random,MARGIN=8,STEP=1/120;
const COLS=['#ff3b30','#2f80ff','#ffd60a','#34c759'],COLHEX=[0xff3b30,0x2f80ff,0xffd60a,0x34c759];
const TIMES=[{n:'Siang',k:1,tint:[1,1,1]},{n:'Sore',k:.74,tint:[1,.82,.66]},{n:'Malam',k:.17,tint:[.55,.66,1]}];
const LOOK={
  aspal:{desc:'Grip tinggi, aspal kering',ground:'#4a7a3a',road:'#3b3e44',top:0x4f9cf0,hor:0xcfe6ff,fog:.0017,tree:'pine',tcol:0x2f6b35,curb:['#d83a34','#f2f2f2'],wall:0xc9cdd3,spray:0xe6e6e6},
  salju:{desc:'Sangat licin, salju turun',ground:'#e9eff6',road:'#cfd6df',top:0x9fb2c8,hor:0xe3eaf2,fog:.0055,tree:'pine',tcol:0xdce8f0,curb:['#ff8a1f','#f4f4f4'],wall:0xe6edf5,spray:0xffffff,snow:true},
  lumpur:{desc:'Berat dan licin, cipratan lumpur',ground:'#5a4630',road:'#4a3623',top:0x7a8590,hor:0xb2b9bd,fog:.0042,tree:'pine',tcol:0x344a2e,curb:['#ffd21f','#222222'],wall:0x6b5a45,spray:0x5a3c22},
  batu:{desc:'Kerikil bergelombang, berdebu',ground:'#8a7556',road:'#9c8a6c',top:0xd98c52,hor:0xf3cf9b,fog:.0032,tree:'rock',tcol:0x7d7468,curb:['#f4f4f4','#2a74d6'],wall:0x8d8272,spray:0xcdaa72}
};
const trk=buildTrack();
const trkPts=[];for(let i=0;i<trk.N;i+=4)trkPts.push([Math.round(trk.x[i]),Math.round(trk.z[i])]);
let phase='lobby',modeKey='aspal',timeIdx=0,laps=3,cdT=0,lastCd=0,raceT=0,resT=0,finOrder=[],qual=1,now=0,fps=60,acc=0,world=null,sky=null,fogRGB=[.8,.8,.8],goT=0,notice='',noticeT=0;
const P=[],keys={};

/* ================= render ================= */
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(),orbit=new THREE.PerspectiveCamera(60,1.7,.1,1500);
const hud=$('hud'),hctx=hud.getContext('2d');let W=innerWidth,H=innerHeight;
function resize(){
  W=innerWidth;H=innerHeight;renderer.setPixelRatio(qual);renderer.setSize(W,H);
  const dp=Math.min(devicePixelRatio||1,2);hud.width=W*dp;hud.height=H*dp;hud.style.width=W+'px';hud.style.height=H+'px';hctx.setTransform(dp,0,0,dp,0,0);
}
addEventListener('resize',resize);resize();

/* ================= tekstur ================= */
function shade(hex,d){const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,v+d))|0;return 'rgb('+f(n>>16&255)+','+f(n>>8&255)+','+f(n&255)+')'}
function ctex(w,h,paint,rep){
  const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(rep)t.repeat.set(rep[0],rep[1]);return t;
}
function speckle(g,w,h,base,amt,n,sz){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){g.fillStyle=shade(base,(rnd()-.5)*amt);g.fillRect(rnd()*w,rnd()*h,sz,sz)}}
function radial(size,stops){return ctex(size,size,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);stops.forEach(s=>r.addColorStop(s[0],s[1]));g.fillStyle=r;g.fillRect(0,0,w,h)})}
const dotTex=radial(32,[[0,'#fff'],[.7,'#fff'],[1,'rgba(255,255,255,0)']]),glowTex=radial(64,[[0,'rgba(255,255,230,1)'],[1,'rgba(255,255,230,0)']]),blobTex=radial(64,[[0,'rgba(0,0,0,.55)'],[1,'rgba(0,0,0,0)']]);

/* ================= dunia ================= */
function ribbon(o0,o1,y,vper){
  const N=trk.N,pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){
    const k=i%N,nx=-trk.tz[k],nz=trk.tx[k],v=(i*trk.L/N)/vper;
    pos.push(trk.x[k]+nx*o0,y,trk.z[k]+nz*o0,trk.x[k]+nx*o1,y,trk.z[k]+nz*o1);uv.push(0,v,1,v);
  }
  for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();return g;
}
function wallGeo(off,hgt){
  const N=trk.N,pos=[],idx=[];
  for(let i=0;i<=N;i++){const k=i%N,x=trk.x[k]-trk.tz[k]*off,z=trk.z[k]+trk.tx[k]*off;pos.push(x,0,z,x,hgt,z)}
  for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function distToTrack(x,z){let d=1e9;for(let i=0;i<trk.N;i++)d=Math.min(d,Math.hypot(x-trk.x[i],z-trk.z[i]));return d}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function buildWorld(){
  if(world){scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose()}})}
  const lk=LOOK[modeKey],tm=TIMES[timeIdx];
  const tint=hex=>{const c=new THREE.Color(hex);c.r=Math.min(1,c.r*tm.k*tm.tint[0]);c.g=Math.min(1,c.g*tm.k*tm.tint[1]);c.b=Math.min(1,c.b*tm.k*tm.tint[2]);return c};
  world=new THREE.Group();scene.add(world);
  const hor=tint(lk.hor),top=tint(lk.top);fogRGB=[hor.r,hor.g,hor.b];
  scene.background=hor;scene.fog=new THREE.FogExp2(hor.getHex(),lk.fog*(timeIdx===2?1.6:1));
  // langit
  const sg=new THREE.SphereGeometry(900,16,10),pos=sg.attributes.position,cols=[];
  for(let i=0;i<pos.count;i++){const y=Math.max(0,Math.min(1,pos.getY(i)/900)),c=hor.clone().lerp(top,Math.pow(y,.6));cols.push(c.r,c.g,c.b)}
  sg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  sky=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-1;world.add(sky);
  // cahaya
  world.add(new THREE.HemisphereLight(tint(lk.top).getHex(),tint(lk.ground).getHex(),1));
  const sun=new THREE.DirectionalLight(tint(0xfff2d8).getHex(),.95);sun.position.set(-.5,1,.4);world.add(sun);
  // tanah
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshLambertMaterial({map:ctex(256,256,(g,w,h)=>speckle(g,w,h,lk.ground,40,2500,3),[400,400])}));
  gnd.rotation.x=-Math.PI/2;gnd.position.y=-.03;world.add(gnd);
  // jalan
  const vp=trk.L/Math.round(trk.L/12),rt=ctex(256,256,(g,w,h)=>{
    speckle(g,w,h,lk.road,modeKey==='batu'?46:26,modeKey==='batu'?5000:3000,modeKey==='batu'?3:2);
    if(modeKey==='aspal'){g.fillStyle='#e8e8e8';g.fillRect(10,0,6,h);g.fillRect(240,0,6,h);g.fillStyle='#d8c04a';g.fillRect(126,0,4,h/2)}
    else{g.fillStyle=modeKey==='salju'?'rgba(120,130,150,.35)':modeKey==='lumpur'?'rgba(20,12,6,.45)':'rgba(70,55,35,.3)';g.fillRect(62,0,34,h);g.fillRect(160,0,34,h)}
  });
  const road=new THREE.Mesh(ribbon(-trk.W/2,trk.W/2,.01,vp),new THREE.MeshLambertMaterial({map:rt,side:THREE.DoubleSide}));world.add(road);
  // pinggir jalan
  const cp=trk.L/Math.round(trk.L/4),ct=ctex(8,32,(g,w,h)=>{g.fillStyle=lk.curb[0];g.fillRect(0,0,w,h/2);g.fillStyle=lk.curb[1];g.fillRect(0,h/2,w,h/2)}),cm=new THREE.MeshLambertMaterial({map:ct,side:THREE.DoubleSide});
  world.add(new THREE.Mesh(ribbon(trk.W/2,trk.W/2+1.2,.02,cp),cm),new THREE.Mesh(ribbon(-trk.W/2-1.2,-trk.W/2,.02,cp),cm));
  // dinding pembatas
  const wm=new THREE.MeshLambertMaterial({color:lk.wall,side:THREE.DoubleSide});
  world.add(new THREE.Mesh(wallGeo(trk.W/2+MARGIN,.9),wm),new THREE.Mesh(wallGeo(-trk.W/2-MARGIN,.9),wm));
  // garis start + gerbang
  const ang=Math.atan2(trk.tz[0],trk.tx[0]),gate=new THREE.Group();gate.position.set(trk.x[0],0,trk.z[0]);gate.rotation.y=-ang;world.add(gate);
  const chk=new THREE.Mesh(new THREE.PlaneGeometry(3,trk.W),new THREE.MeshLambertMaterial({map:ctex(32,128,(g,w,h)=>{for(let y=0;y<8;y++)for(let x=0;x<2;x++){g.fillStyle=(x+y)%2?'#111':'#f2f2f2';g.fillRect(x*16,y*16,16,16)}}),side:THREE.DoubleSide}));
  chk.rotation.x=-Math.PI/2;chk.position.y=.03;gate.add(chk);
  const gm=new THREE.MeshLambertMaterial({color:0x2a2e38}),beam=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,trk.W+4),new THREE.MeshLambertMaterial({color:0xd83a34}));
  beam.position.y=6;gate.add(beam);
  [-1,1].forEach(s=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.8,6,.8),gm);p.position.set(0,3,s*(trk.W/2+2));gate.add(p)});
  // pohon / batu
  const R=mulberry(7),isRock=lk.tree==='rock',nT=isRock?150:260,m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),sc=new THREE.Vector3(),ps=new THREE.Vector3();
  const iA=new THREE.InstancedMesh(isRock?new THREE.IcosahedronGeometry(1.6,0):new THREE.ConeGeometry(1.7,5,7),new THREE.MeshLambertMaterial({color:lk.tcol,flatShading:true}),nT);
  const iB=isRock?null:new THREE.InstancedMesh(new THREE.CylinderGeometry(.25,.3,1.6,5),new THREE.MeshLambertMaterial({color:0x4a3524}),nT);
  let n=0;
  for(let tries=0;tries<nT*8&&n<nT;tries++){
    const i=Math.floor(R()*trk.N),off=(R()<.5?-1:1)*(trk.W/2+MARGIN+3+R()*70),x=trk.x[i]-trk.tz[i]*off,z=trk.z[i]+trk.tx[i]*off;
    if(distToTrack(x,z)<trk.W/2+MARGIN+3)continue;
    const s=.8+R()*1.1;q.setFromAxisAngle(up,R()*6.28);
    if(isRock){m4.compose(ps.set(x,.5*s,z),q,sc.set(s*(1+R()),s*.8,s*(1+R())));iA.setMatrixAt(n,m4)}
    else{m4.compose(ps.set(x,4.1*s,z),q,sc.set(s,s,s));iA.setMatrixAt(n,m4);m4.compose(ps.set(x,.8*s,z),q,sc.set(s,s,s));iB.setMatrixAt(n,m4)}
    n++;
  }
  iA.count=n;iA.frustumCulled=false;world.add(iA);if(iB){iB.count=n;iB.frustumCulled=false;world.add(iB)}
  P.forEach(p=>{p.snow.pts.visible=false});
  $('modetag')&&($('modetag').textContent=MODES[modeKey].name+' · '+tm.n);
}

/* ================= mobil ================= */
function mkCar(ci){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const Mt=c=>new THREE.MeshLambertMaterial({color:c}),mcol=Mt(COLHEX[ci]),dark=Mt(0x14161b),glass=Mt(0x1f3347),chrome=Mt(0xbfc5cc);
  const box=(par,l,h,w,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(l,h,w),m);o.position.set(x,y,z);par.add(o);return o};
  box(body,4.3,.5,1.85,mcol,0,.55,0);box(body,2.1,.46,1.6,glass,-.25,1.02,0);box(body,1.9,.07,1.55,mcol,-.25,1.27,0);
  box(body,.3,.14,1.9,dark,2.12,.4,0);box(body,.3,.14,1.9,dark,-2.12,.4,0);box(body,.5,.06,1.9,dark,-2.0,1.02,0);
  const lampM=new THREE.MeshBasicMaterial({color:0x888877}),tailM=new THREE.MeshBasicMaterial({color:0x5a0000});
  [-1,1].forEach(s=>{box(body,.08,.16,.4,lampM,2.18,.62,s*.6);box(body,.08,.14,.4,tailM,-2.18,.62,s*.62)});
  const wheels=[];
  [[1.3,-1],[1.3,1],[-1.3,-1],[-1.3,1]].forEach(([x,s])=>{
    const piv=new THREE.Group();piv.position.set(x,.33,s*.95);g.add(piv);
    const spin=new THREE.Group();piv.add(spin);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.26,14),Mt(0x101114));tire.rotation.x=Math.PI/2;spin.add(tire);
    box(spin,.52,.08,.28,chrome,0,0,0);box(spin,.08,.52,.28,chrome,0,0,0);
    wheels.push({piv,spin,front:x>0});
  });
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.8),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,fog:false}));blob.rotation.x=-Math.PI/2;blob.position.y=.04;g.add(blob);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(2.4,16,14,1,true),new THREE.MeshBasicMaterial({color:0xfff4cc,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  beam.rotation.z=Math.PI/2;beam.position.set(10.2,.7,0);g.add(beam);
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(15,7),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  pool.rotation.x=-Math.PI/2;pool.position.set(9,.07,0);g.add(pool);
  return {g,body,wheels,lampM,tailM,beam,pool};
}
function updateMesh(p){
  const c=p.car,m=p.mesh;
  m.g.position.set(c.x,0,c.z);m.g.rotation.y=-c.psi;
  m.body.rotation.x=-Math.max(-.07,Math.min(.07,c.ay*.004));m.body.rotation.z=Math.max(-.05,Math.min(.05,c.ax*.003));
  m.wheels.forEach(w=>{w.spin.rotation.z=-c.wheel;if(w.front)w.piv.rotation.y=-c.delta});
  m.lampM.color.setHex(p.lights?0xffffcc:0x888877);
  m.beam.material.opacity=p.lights?[0,.06,.14][timeIdx]:0;m.pool.material.opacity=p.lights?[0,.22,.5][timeIdx]:0;
  const br=(c.gear<0?p.in.g:p.in.b)>.2;m.tailM.color.setHex(br?0xff2020:p.lights?0x990000:0x5a0000);
}

/* ================= partikel ================= */
const NSP=220,spPos=new Float32Array(NSP*3).fill(-999),spCol=new Float32Array(NSP*3),spVel=new Float32Array(NSP*3),spLife=new Float32Array(NSP),spBase=new Float32Array(NSP*3);let spN=0;
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));spGeo.setAttribute('color',new THREE.BufferAttribute(spCol,3));
const spPts=new THREE.Points(spGeo,new THREE.PointsMaterial({size:1,map:dotTex,vertexColors:true,alphaTest:.4}));spPts.frustumCulled=false;scene.add(spPts);
function emit(x,y,z,vx,vy,vz,hex){
  const k=spN++%NSP;spPos[k*3]=x;spPos[k*3+1]=y;spPos[k*3+2]=z;spVel[k*3]=vx;spVel[k*3+1]=vy;spVel[k*3+2]=vz;spLife[k]=1;
  spBase[k*3]=(hex>>16&255)/255;spBase[k*3+1]=(hex>>8&255)/255;spBase[k*3+2]=(hex&255)/255;
}
function stepSpray(dt){
  const kk=TIMES[timeIdx].k;
  for(let k=0;k<NSP;k++){
    if(spLife[k]<=0)continue;
    spLife[k]-=dt*1.1;
    if(spLife[k]<=0){spPos[k*3+1]=-999;continue}
    spVel[k*3+1]-=7*dt;spPos[k*3]+=spVel[k*3]*dt;spPos[k*3+1]=Math.max(.05,spPos[k*3+1]+spVel[k*3+1]*dt);spPos[k*3+2]+=spVel[k*3+2]*dt;
    const l=spLife[k];for(let a=0;a<3;a++)spCol[k*3+a]=spBase[k*3+a]*kk*l+fogRGB[a]*(1-l);
  }
  spGeo.attributes.position.needsUpdate=true;spGeo.attributes.color.needsUpdate=true;
}
function emitFor(p,dt){
  const c=p.car,lk=LOOK[modeKey],v=Math.hypot(c.vx,c.vy);
  let rate=0,hex=lk.spray;
  if(modeKey==='aspal'){rate=(c.slip>.22||c.spin)&&v>6?.6:0}
  else rate=Math.min(1,v/25)*(modeKey==='batu'?.7:modeKey==='lumpur'?.9:.8)+(c.spin?.3:0);
  p.emitAcc=(p.emitAcc||0)+rate*dt*60;
  const cp=Math.cos(c.psi),sn=Math.sin(c.psi);
  while(p.emitAcc>=1){
    p.emitAcc-=1;const s=rnd()<.5?-.9:.9,bx=c.x-cp*1.3-sn*s,bz=c.z-sn*1.3+cp*s;
    const wx=c.vx*cp-c.vy*sn,wz=c.vx*sn+c.vy*cp;
    emit(bx,.25,bz,-wx*.15+(rnd()-.5)*2,1+rnd()*2.4,-wz*.15+(rnd()-.5)*2,hex);
  }
}
function mkSnow(){
  const n=500,pos=new Float32Array(n*3);for(let i=0;i<n*3;i++)pos[i]=(rnd()-.5)*60;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.22,color:0xffffff,map:dotTex,transparent:true,alphaTest:.3,depthWrite:false,fog:false}));
  pts.frustumCulled=false;pts.visible=false;scene.add(pts);return {pts,pos};
}
function stepSnow(p,dt){
  const cam=p.camObj.position,a=p.snow.pos;
  for(let i=0;i<a.length;i+=3){
    a[i+1]-=4*dt;a[i]+=1.2*dt;
    a[i]=cam.x+(((a[i]-cam.x+30)%60)+60)%60-30;a[i+2]=cam.z+(((a[i+2]-cam.z+30)%60)+60)%60-30;
    if(a[i+1]<cam.y-6)a[i+1]+=26;else if(a[i+1]>cam.y+20)a[i+1]-=26;
  }
  p.snow.pts.geometry.attributes.position.needsUpdate=true;
}

/* ================= suara ================= */
let ac=null;
function unlockAudio(){if(!ac){try{ac=new AudioContext()}catch(e){}}ac&&ac.resume&&ac.resume()}
function beep(f,d){if(!ac)return;try{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type='sine';o.frequency.value=f;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.02)}catch(e){}}
function boom(v){if(!ac)return;try{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type='square';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.25);o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(Math.min(.3,.04+v*.01),t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.3)}catch(e){}}
function startEngine(p){
  if(!ac||p.eng)return;
  const o1=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();
  o1.type='sawtooth';o2.type='square';f.type='lowpass';o1.connect(f);o2.connect(f);f.connect(g);g.connect(ac.destination);g.gain.value=0;o1.start();o2.start();
  p.eng={o1,o2,g,f};
}
function stopEngine(p){if(p.eng){try{p.eng.o1.stop();p.eng.o2.stop()}catch(e){}p.eng=null}}
function soundFor(p){
  if(!p.eng)return;
  const c=p.car,hz=c.rpm/60*2,t=ac.currentTime,thr=c.gear<0?p.in.b:p.in.g,vol=.5/Math.max(1,active().length);
  p.eng.o1.frequency.setTargetAtTime(hz,t,.04);p.eng.o2.frequency.setTargetAtTime(hz*2,t,.04);
  p.eng.f.frequency.setTargetAtTime(500+c.rpm*.35,t,.05);p.eng.g.gain.setTargetAtTime((.012+.03*thr)*vol,t,.05);
}

/* ================= pemain & balapan ================= */
const active=()=>P.filter(p=>!p.wait);
const freeColor=()=>{for(let i=0;i<4;i++)if(!P.some(p=>p.ci===i))return i;return 0};
function gridPos(slot){
  const s0=trk.L-6-Math.floor(slot/2)*9,i=Math.round(s0/trk.L*trk.N)%trk.N,lat=slot%2?2.6:-2.6;
  return {x:trk.x[i]-trk.tz[i]*lat,z:trk.z[i]+trk.tx[i]*lat,psi:Math.atan2(trk.tz[i],trk.tx[i])};
}
function resetPlayer(p){
  const g=gridPos(Math.max(0,P.indexOf(p)));
  p.car=createCar(g.x,g.z,g.psi);p.loc=locate(trk,g.x,g.z);p.sPrev=p.loc.s;p.lap=0;p.prog=-6;p.lapT=0;p.best=null;p.last=null;
  p.finished=false;p.finT=null;p.rank=1;p.idle=0;p.wrong=false;p.camPsi=g.psi;p.bump=0;
}
function addPlayer(pid,name,kb){
  if(P.length>=4)return null;
  const p={pid,kb,name,ci:freeColor(),in:{s:0,g:0,b:0},kS:0,kG:0,lights:true,cam:0,mesh:null,camObj:new THREE.PerspectiveCamera(62,1.7,.1,1500),snow:mkSnow(),eng:null,seen:now,wait:phase==='countdown'||phase==='race'};
  p.mesh=mkCar(p.ci);scene.add(p.mesh.g);P.push(p);resetPlayer(p);
  if(pid!=null)sendInfo(p);
  renderLobby();return p;
}
function removePlayer(p){scene.remove(p.mesh.g);scene.remove(p.snow.pts);stopEngine(p);P.splice(P.indexOf(p),1);renderLobby()}
function sendInfo(p){sendTo(p.pid,{t:'track',pts:trkPts});sendTo(p.pid,{t:'info',ci:p.ci,name:p.name})}
function say(t){notice=t;noticeT=now+3}
function startRace(){
  if(!P.length){say('Belum ada pemain. Buka alamat di HP, atau tekan K untuk pemain keyboard.');return}
  P.forEach(p=>{p.wait=false});P.forEach(resetPlayer);
  finOrder=[];phase='countdown';cdT=3;lastCd=4;raceT=0;goT=0;unlockAudio();P.forEach(startEngine);
  $('lobby').classList.add('hide');$('results').classList.add('hide');
}
function toLobby(){
  phase='lobby';P.forEach(p=>{p.wait=false;stopEngine(p);resetPlayer(p)});
  $('results').classList.add('hide');$('lobby').classList.remove('hide');renderLobby();
}
function endRace(){
  phase='results';resT=14;P.forEach(stopEngine);
  const A=active().slice().sort((a,b)=>(a.finished?a.finT:1e9)-(b.finished?b.finT:1e9)||b.prog-a.prog);
  $('resBody').innerHTML=A.map((p,i)=>'<tr><td>'+(i+1)+'</td><td><i style="background:'+COLS[p.ci]+'"></i>'+p.name+'</td><td>'+(p.finished?fmtTime(p.finT):'belum selesai')+'</td><td>'+fmtTime(p.best)+'</td></tr>').join('');
  $('results').classList.remove('hide');
}
function recover(p){
  const c=p.car,i=p.loc.i;c.x=trk.x[i];c.z=trk.z[i];c.psi=Math.atan2(trk.tz[i],trk.tx[i]);c.vx=c.vy=c.r=0;c.gear=1;p.idle=0;p.loc=locate(trk,c.x,c.z,i);
}
function stepPlayer(p){
  const c=p.car;
  if(phase!=='race'){c.vx=c.vy=c.r=0;return}                     // di grid mobil diam (rem tangan)
  const I=p.finished?{s:0,g:0,b:.4}:p.in;
  p.loc=locate(trk,c.x,c.z,p.loc.i);
  applySurface(c,MODES[modeKey],p.loc.off,trk.W);
  stepCar(c,I,STEP);
  const l2=locate(trk,c.x,c.z,p.loc.i),h=wallCollide(c,trk,l2,MARGIN);
  if(h>1)p.bump=Math.max(p.bump,h);
  p.loc=l2;
}
function collide(A){
  for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){
    const h=collideCars(A[i].car,A[j].car);
    if(h>1.5){A[i].bump=Math.max(A[i].bump,h);A[j].bump=Math.max(A[j].bump,h)}
  }
}
function lapLogic(p,dt){
  const c=p.car,L=trk.L,s=p.loc.s;
  if(p.sPrev>L*.75&&s<L*.25){
    p.lap++;
    if(p.lap===1)p.lapT=raceT;
    else if(p.lap>=2){const lt=raceT-p.lapT;p.last=lt;p.best=p.best==null?lt:Math.min(p.best,lt);p.lapT=raceT}
    if(p.lap>laps&&!p.finished){p.finished=true;p.finT=raceT;finOrder.push(p)}
  }else if(p.sPrev<L*.25&&s>L*.75)p.lap--;
  p.sPrev=s;p.prog=(p.lap-1)*L+s;
  const v=Math.hypot(c.vx,c.vy),wx=c.vx*Math.cos(c.psi)-c.vy*Math.sin(c.psi),wz=c.vx*Math.sin(c.psi)+c.vy*Math.cos(c.psi);
  p.wrong=v>4&&(wx*trk.tx[p.loc.i]+wz*trk.tz[p.loc.i])<-.3*v;
  p.idle=v<1.2&&!p.finished?p.idle+dt:0;
  if(p.idle>5)recover(p);
}
function rankAll(){
  const A=active().slice().sort((a,b)=>(a.finished&&b.finished?a.finT-b.finT:a.finished?-1:b.finished?1:b.prog-a.prog));
  A.forEach((p,i)=>p.rank=i+1);
}
function updateCam(p,dt){
  const c=p.car,cam=p.camObj,v=Math.hypot(c.vx,c.vy);
  let d=c.psi-p.camPsi;d=Math.atan2(Math.sin(d),Math.cos(d));
  p.camPsi+=p.cam===2?d:d*(1-Math.exp(-dt*5));
  const f=p.camPsi,fx=Math.cos(f),fz=Math.sin(f);
  const sh=(MODES[modeKey].rough*v*.0012)+Math.min(.3,p.shake||0);
  p.shake=(p.shake||0)*Math.exp(-dt*6);
  if(p.cam===2){cam.position.set(c.x+fx*1,1.2+(rnd()-.5)*sh,c.z+fz*1);cam.lookAt(c.x+fx*30,1.1,c.z+fz*30)}
  else{
    const dist=p.cam===0?7.2:11,hh=p.cam===0?2.5:4.2;
    cam.position.set(c.x-fx*dist,hh+(rnd()-.5)*sh,c.z-fz*dist);cam.lookAt(c.x+fx*8,1,c.z+fz*8);
  }
  cam.fov=60+Math.min(14,v*.18);
}

/* ================= jaringan ================= */
let ws=null;
const wsSend=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
const sendTo=(pid,o)=>{o.to=pid;wsSend(o)};
const buzz=(p,ms)=>{if(p.pid!=null)sendTo(p.pid,{t:'buzz',ms:Math.round(ms)})};
function connectWS(){
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
  ws.onopen=()=>wsSend({t:'hello',role:'game'});
  ws.onmessage=e=>onMsg(JSON.parse(e.data));
  ws.onclose=()=>setTimeout(connectWS,1000);
}
function onRoster(list){
  const ids=new Set();
  for(const r of list){
    if(!r.alive)continue;ids.add(r.id);
    let p=P.find(x=>x.pid===r.id);
    if(!p){p=addPlayer(r.id,r.name,false);if(!p){sendTo(r.id,{t:'full'});continue}}
    if(p.name!==r.name){p.name=r.name;renderLobby()}
    p.seen=now;
  }
  for(const p of P.slice())if(p.pid!=null&&!ids.has(p.pid)&&now-p.seen>3)removePlayer(p);
}
function onEvent(p,k){
  const c=p.car;if(!c)return;
  if(k==='up')shiftGear(c,1);else if(k==='down')shiftGear(c,-1);
  else if(k==='lights')p.lights=!p.lights;else if(k==='auto')c.auto=!c.auto;else if(k==='cam')p.cam=(p.cam+1)%3;
}
function onMsg(d){
  if(d.t==='roster')return onRoster(d.players);
  const p=P.find(x=>x.pid===d.id);if(!p)return;
  if(d.t==='hello')sendInfo(p);
  else if(d.t==='i'){p.in.s=clamp(+d.s||0,-1,1);p.in.g=clamp(+d.g||0,0,1);p.in.b=clamp(+d.b||0,0,1);p.seen=now;p.inT=now}
  else if(d.t==='e')onEvent(p,d.k);
}
function sendStates(){
  const A=active(),cars=A.map(p=>[Math.round(p.car.x),Math.round(p.car.z),p.ci]);
  for(const p of P){
    if(p.pid==null)continue;const c=p.car;
    sendTo(p.pid,{t:'st',sp:Math.abs(c.vx)*3.6,g:c.gear,r:(c.rpm-CAR.idle)/(CAR.red-CAR.idle),l:Math.max(1,p.lap),L:laps,p:p.rank,n:A.length,
      ph:p.wait?'wait':phase,cd:Math.max(0,Math.ceil(cdT)),lt:p.lights,au:c.auto,cm:p.cam,fin:p.finished,wr:p.wrong,c:cars,mi:A.indexOf(p)});
  }
}

/* ================= antarmuka lobi ================= */
function buildLobby(){
  $('modes').innerHTML=MODE_KEYS.map((k,i)=>'<button data-m="'+k+'"><b>'+(i+1)+' · '+MODES[k].name+'</b><small>'+LOOK[k].desc+'</small></button>').join('');
  $('times').innerHTML=TIMES.map((t,i)=>'<button data-t="'+i+'">'+t.n+'</button>').join('');
  $('laps').innerHTML=[1,2,3,5].map(n=>'<button data-l="'+n+'">'+n+' lap</button>').join('');
  $('lobby').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.m)setMode(b.dataset.m);else if(b.dataset.t)setTime(+b.dataset.t);else if(b.dataset.l){laps=+b.dataset.l;renderLobby()}
  });
}
function setMode(k){modeKey=k;buildWorld();renderLobby()}
function setTime(i){timeIdx=i;buildWorld();renderLobby()}
function renderLobby(){
  document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===modeKey));
  document.querySelectorAll('#times button').forEach(b=>b.classList.toggle('on',+b.dataset.t===timeIdx));
  document.querySelectorAll('#laps button').forEach(b=>b.classList.toggle('on',+b.dataset.l===laps));
  $('pc').textContent=P.length;
  let h='';for(let i=0;i<4;i++){const p=P[i];h+=p?'<div class="pl"><i style="background:'+COLS[p.ci]+'"></i>'+p.name+(p.kb?' (keyboard)':'')+'</div>':'<div class="pl empty"><i></i>kosong</div>'}
  $('plist').innerHTML=h;
}
fetch('/api/info').then(r=>r.json()).then(j=>{$('url').textContent=j.url;if(window.QRCode)new QRCode($('qr'),{text:j.url,width:132,height:132})}).catch(()=>{$('url').textContent='Lihat alamat HP di jendela server.'});

/* ================= input keyboard (tes tanpa HP) ================= */
const kbPlayer=()=>P.find(p=>p.kb);
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault();unlockAudio();if(phase==='lobby')startRace();else if(phase==='results')toLobby()}
  else if(e.code==='KeyK'&&phase==='lobby'){const k=kbPlayer();if(k)removePlayer(k);else addPlayer(null,'Keyboard',true)}
  else if(e.code==='KeyQ'){qual=qual===1?.75:qual===.75?.5:1;resize();say('Kualitas grafis: '+Math.round(qual*100)+'%')}
  else if(e.code==='KeyF'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();
  else if(phase==='lobby'&&/^Digit[1-4]$/.test(e.code))setMode(MODE_KEYS[+e.code[5]-1]);
  const k=kbPlayer();
  if(k){
    if(e.code==='KeyZ')onEvent(k,'down');else if(e.code==='KeyX')onEvent(k,'up');else if(e.code==='KeyL')onEvent(k,'lights');
    else if(e.code==='KeyC')onEvent(k,'cam');else if(e.code==='KeyT')onEvent(k,'auto');else if(e.code==='KeyR'&&phase==='race')recover(k);
  }
});
addEventListener('keyup',e=>{keys[e.code]=false});
function readKeys(p,dt){
  const tgt=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0),th=keys.ArrowUp||keys.KeyW?1:0,br=keys.ArrowDown||keys.KeyS?1:0;
  p.kS+=(tgt-p.kS)*Math.min(1,dt*(tgt?4:9));p.kG+=(th-p.kG)*Math.min(1,dt*(th?4:12));
  p.in.s=p.kS;p.in.g=p.kG;p.in.b=br;
}

/* ================= HUD ================= */
function T(g,s,x,y,size,col,al,wt){g.font=(wt||700)+' '+size+'px "Segoe UI",system-ui,sans-serif';g.fillStyle=col;g.textAlign=al||'left';g.fillText(s,x,y)}
const bb=(()=>{let a=1e9,b=-1e9,c=1e9,d=-1e9;for(let i=0;i<trk.N;i++){a=Math.min(a,trk.x[i]);b=Math.max(b,trk.x[i]);c=Math.min(c,trk.z[i]);d=Math.max(d,trk.z[i])}return {x0:a,x1:b,z0:c,z1:d}})();
const mapPath=typeof Path2D==='undefined'?null:(()=>{const p=new Path2D();for(let i=0;i<trk.N;i++)i?p.lineTo(trk.x[i],trk.z[i]):p.moveTo(trk.x[i],trk.z[i]);p.closePath();return p})();
const gearTxt=g=>g<0?'R':String(g);
function hudView(g,p,r){
  const [x,y,w,h]=r,u=Math.min(w/1.7,h)/100,c=p.car,sp=Math.abs(c.vx)*3.6;
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.shadowColor='rgba(0,0,0,.75)';g.shadowBlur=6*u;
  const ac2=COLS[p.ci];
  T(g,String(Math.round(sp)),x+w-22*u,y+h-11*u,15*u,'#fff','right',800);
  T(g,'km/j',x+w-22*u,y+h-6.5*u,3.4*u,'#aab2c2','right',600);
  T(g,gearTxt(c.gear),x+w-5*u,y+h-11*u,14*u,ac2,'right',800);
  const frac=Math.max(0,Math.min(1,(c.rpm-CAR.idle)/(CAR.red-CAR.idle))),bx=x+w-46*u,by=y+h-5*u;
  g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.14)';g.fillRect(bx,by,42*u,2*u);g.fillStyle=frac>.88?'#ff3b30':ac2;g.fillRect(bx,by,42*u*frac,2*u);g.shadowBlur=6*u;
  const rank=p.rank,n=active().length;
  T(g,'P'+rank,x+5*u,y+13*u,12*u,'#fff','left',800);T(g,'/'+n,x+5*u+(rank>9?15:8.4)*u,y+13*u,5*u,'#aab2c2','left',700);
  T(g,'LAP '+Math.min(Math.max(1,p.lap),laps)+'/'+laps,x+5*u,y+19.5*u,4.2*u,'#fff','left',700);
  T(g,p.name,x+w/2,y+6*u,4.4*u,ac2,'center',700);
  if(phase==='race'||phase==='results'){
    const cur=p.lap>=1&&!p.finished?raceT-p.lapT:p.last;
    T(g,fmtTime(cur),x+w-5*u,y+10*u,6.6*u,'#fff','right',700);T(g,'TERBAIK '+fmtTime(p.best),x+w-5*u,y+16*u,3.6*u,'#aab2c2','right',600);
  }
  if(p.wrong&&phase==='race')T(g,'ARAH SALAH',x+w/2,y+h*.3,9*u,'#ff3b30','center',800);
  if(p.finished)T(g,'SELESAI  P'+rank,x+w/2,y+h*.3,9*u,'#ffd60a','center',800);
  if(!p.lights&&timeIdx>0)T(g,'LAMPU MATI',x+w/2,y+h*.38,3.6*u,'#ffb347','center',700);
  // peta mini
  if(mapPath){
    const m=24*u,mx=x+5*u,mz=y+h-5*u-m,sc=(m-4*u)/Math.max(bb.x1-bb.x0,bb.z1-bb.z0),ox=mx+(m-(bb.x1-bb.x0)*sc)/2-bb.x0*sc,oz=mz+(m-(bb.z1-bb.z0)*sc)/2-bb.z0*sc;
    g.shadowBlur=0;g.fillStyle='rgba(8,10,14,.55)';g.fillRect(mx,mz,m,m);
    g.save();g.translate(ox,oz);g.scale(sc,sc);g.lineJoin='round';g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=Math.max(2.5,3*u)/sc;g.stroke(mapPath);g.restore();
    active().forEach(q=>{g.beginPath();g.arc(q.car.x*sc+ox,q.car.z*sc+oz,(q===p?1.6:1.15)*u,0,7);g.fillStyle=COLS[q.ci];g.fill();if(q===p){g.strokeStyle='#fff';g.lineWidth=.5*u;g.stroke()}});
  }
  g.restore();
}
function layout(n){
  if(n<=1)return [[0,0,W,H]];
  if(n===2)return [[0,0,W/2,H],[W/2,0,W/2,H]];
  return [[0,0,W/2,H/2],[W/2,0,W/2,H/2],[0,H/2,W/2,H/2],[W/2,H/2,W/2,H/2]].slice(0,n);
}
function drawHud(views){
  const g=hctx;g.clearRect(0,0,W,H);
  views.forEach(([p,r])=>hudView(g,p,r));
  if(views.length>1){g.fillStyle='#000';g.fillRect(W/2-1,0,2,H);if(views.length>2)g.fillRect(0,H/2-1,W,2)}
  const u=Math.min(W/1.7,H)/100;
  if(phase==='countdown'){const n=Math.ceil(cdT);g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=12;T(g,n>0?String(n):'',W/2,H*.42,26*u,'#fff','center',800)}
  if(goT>0){g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=12;T(g,'GO!',W/2,H*.42,26*u,'#34c759','center',800)}
  g.shadowBlur=0;T(g,Math.round(fps)+' fps',W-8,14,11,'rgba(255,255,255,.5)','right',600);
  if(now<noticeT){g.fillStyle='rgba(0,0,0,.6)';const tw=g.measureText(notice).width+30;g.fillRect(W/2-tw/2,H-52,tw,32);T(g,notice,W/2,H-31,15,'#fff','center',600)}
}

/* ================= render + loop ================= */
function render(){
  const A=active();renderer.setScissorTest(true);
  const lobby=phase==='lobby'||!A.length;
  if(lobby){
    const a=now*.25,cx=trk.x[0]-12*trk.tx[0],cz=trk.z[0]-12*trk.tz[0];
    orbit.aspect=W/H;orbit.position.set(cx+Math.cos(a)*15,4.2,cz+Math.sin(a)*15);orbit.lookAt(cx,1,cz);orbit.updateProjectionMatrix();
    sky.position.copy(orbit.position);renderer.setViewport(0,0,W,H);renderer.setScissor(0,0,W,H);renderer.render(scene,orbit);
    hctx.clearRect(0,0,W,H);
    return [];
  }
  const rects=layout(A.length),views=[];
  A.forEach((p,i)=>{
    const [x,y,w,h]=rects[i],cam=p.camObj;cam.aspect=w/h;cam.updateProjectionMatrix();
    sky.position.copy(cam.position);
    P.forEach(q=>{q.snow.pts.visible=LOOK[modeKey].snow&&q===p});
    renderer.setViewport(x,H-y-h,w,h);renderer.setScissor(x,H-y-h,w,h);renderer.render(scene,cam);
    views.push([p,rects[i]]);
  });
  return views;
}
function update(dt){
  now+=dt;
  P.forEach(p=>{if(p.kb)readKeys(p,dt);else if(phase==='race'&&now-(p.inT||0)>1){p.in.s=0;p.in.g=0;p.in.b=.3}});   // HP berhenti mengirim: lepas gas
  if(phase==='countdown'){
    cdT-=dt;const n=Math.ceil(cdT);
    if(n!==lastCd){lastCd=n;if(n>=1&&n<=3)beep(520,.12)}
    if(cdT<=1&&phase==='countdown'&&cdT+dt>1){/* tersisa 1 detik */}
    if(cdT<=0){phase='race';raceT=0;goT=1.2;beep(880,.45)}
  }else if(phase==='race')raceT+=dt;
  if(goT>0)goT-=dt;
  const A=active();
  if(phase==='countdown'||phase==='race'){
    acc+=dt;let n=0;
    while(acc>=STEP&&n<8){A.forEach(stepPlayer);collide(A);acc-=STEP;n++}
    if(n>=8)acc=0;
    A.forEach(p=>{
      p.loc=locate(trk,p.car.x,p.car.z,p.loc.i);
      if(phase==='race'){lapLogic(p,dt);if(p.bump>1){buzz(p,Math.min(250,p.bump*25));boom(p.bump);p.shake=Math.min(.35,p.bump*.03);p.bump=0}}
      emitFor(p,dt);soundFor(p);
    });
    rankAll();
    if(phase==='race'){
      const all=A.length>0&&A.every(p=>p.finished);
      if(all||(finOrder.length&&raceT>finOrder[0].finT+25))endRace();
    }
  }else if(phase==='results'){resT-=dt;if(resT<=0)toLobby()}
  A.forEach(p=>{updateMesh(p);updateCam(p,dt);if(LOOK[modeKey].snow)stepSnow(p,dt)});
  P.forEach(p=>{if(p.wait)updateMesh(p)});
  stepSpray(dt);
}
let lastT=0,sendT=0;
function loop(ts){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(ts-lastT)/1000||.016);lastT=ts;fps+=(1/dt-fps)*.05;
  update(dt);
  const views=render();drawHud(views);
  sendT+=dt;if(sendT>=.1){sendT=0;sendStates()}
}
buildLobby();buildWorld();renderLobby();connectWS();requestAnimationFrame(loop);
