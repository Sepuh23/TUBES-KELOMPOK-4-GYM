/* game.js v2: dunia 3D HD, 8 mobil, ban, pemain, balapan, HUD, jaringan (layar laptop). Butuh three.js + physics.js */
const $=id=>document.getElementById(id),D2R=Math.PI/180,rnd=Math.random,MARGIN=8,STEP=1/120;
const COLS=['#ff3b30','#2f80ff','#ffd60a','#34c759'];
const PAINTS=['#e63946','#f77f00','#ffd60a','#2a9d8f','#2f80ff','#7b2cbf','#f1f1f1','#1b1b1e','#8d99ae','#06d6a0'];
const TIMES=[{n:'Siang',k:1,tint:[1,1,1]},{n:'Sore',k:.74,tint:[1,.82,.66]},{n:'Malam',k:.17,tint:[.55,.66,1]}];
const QUALS=[{n:'HD',pr:()=>Math.min(devicePixelRatio||1,1.5)},{n:'Seimbang',pr:()=>1},{n:'Ringan',pr:()=>.7}];
const LOOK={
  aspal:{desc:'Grip tinggi, aspal kering',ground:'#4f7f3d',road:'#3a3d42',top:'#3f86e0',hor:'#cfe4f7',fog:.0016,cloud:.8,hill:'#7e9a6a',leaf:[0x2f6b35,0x3e7d3b,0x4f8f45],round:.4,bush:0x3d6b34,curb:['#d83a34','#f2f2f2'],wall:0xc9cdd3,spray:0xe6e6e6},
  salju:{desc:'Sangat licin, salju turun',ground:'#e9eff6',road:'#cfd6df',top:'#8ea6c4',hor:'#e3eaf2',fog:.0055,cloud:.9,hill:'#ffffff',leaf:[0xdce8f0,0xcfdde8,0xe8f0f6],round:0,bush:0xe2ebf2,curb:['#ff8a1f','#f4f4f4'],wall:0xe6edf5,spray:0xffffff,snow:true},
  lumpur:{desc:'Berat dan licin, cipratan lumpur',ground:'#5a4630',road:'#4a3623',top:'#6f7c88',hor:'#b2b9bd',fog:.004,cloud:.9,hill:'#6b5a45',leaf:[0x34502e,0x3f5c35,0x2c4528],round:.2,bush:0x3b5030,curb:['#ffd21f','#222222'],wall:0x6b5a45,spray:0x5a3c22},
  batu:{desc:'Kerikil bergelombang, berdebu',ground:'#8a7556',road:'#9c8a6c',top:'#d98a50',hor:'#f3cf9b',fog:.003,cloud:.3,hill:'#b07a50',leaf:[0x7d7468,0x6e665b,0x8b8174],round:0,bush:0x8a7a52,curb:['#f4f4f4','#2a74d6'],wall:0x8d8272,spray:0xcdaa72,rocks:true}
};
const trk=buildTrack();
const trkPts=[];for(let i=0;i<trk.N;i+=4)trkPts.push([Math.round(trk.x[i]),Math.round(trk.z[i])]);
const GARAGE={cars:CAR_KEYS.map(k=>{const S=CARS[k],st=carStats(k);return {id:k,name:S.name,desc:S.desc,drv:S.drv,hp:st.hp,kg:S.m,t100:st.t100,vmax:st.vmax}}),
  tires:TIRE_KEYS.map(k=>({id:k,name:TIRES[k].name,desc:TIRES[k].desc})),paints:PAINTS};
let phase='lobby',modeKey='aspal',timeIdx=0,laps=3,qi=0,cdT=0,lastCd=0,raceT=0,resT=0,finOrder=[],now=0,fps=60,acc=0,world=null,sky=null,fogRGB=[.8,.8,.8],goT=0,notice='',noticeT=0;
const P=[],keys={};

/* ================= render ================= */
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(),orbit=new THREE.PerspectiveCamera(60,1.7,.1,2200);
const hud=$('hud'),hctx=hud.getContext('2d');let W=innerWidth,H=innerHeight;
function resize(){
  W=innerWidth;H=innerHeight;renderer.setPixelRatio(QUALS[qi].pr());renderer.setSize(W,H);
  const dp=Math.min(devicePixelRatio||1,2);hud.width=W*dp;hud.height=H*dp;hud.style.width=W+'px';hud.style.height=H+'px';hctx.setTransform(dp,0,0,dp,0,0);
}
addEventListener('resize',resize);resize();
let pmrem=null,envRT=null;
function makeEnv(tex){
  try{
    if(!pmrem)pmrem=new THREE.PMREMGenerator(renderer);
    const es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,fog:false})));
    if(envRT)envRT.dispose();envRT=pmrem.fromScene(es);scene.environment=envRT.texture;
  }catch(e){scene.environment=null}
}

/* ================= tekstur (halus, tanpa pola kotak) ================= */
const clamp01=v=>Math.max(0,Math.min(1,v));
function shade(hex,d){const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,v+d))|0;return [f(n>>16&255),f(n>>8&255),f(n&255)]}
const rgba=(c,a)=>'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tex(c,rep,clampT){
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.wrapT=clampT?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;
  t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());if(rep)t.repeat.set(rep[0],rep[1]);return t;
}
/* bercak lembut yang menyambung di tepi (tiling mulus) */
function blots(g,w,h,base,n,rmin,rmax,amt,alpha){
  for(let i=0;i<n;i++){
    const x=rnd()*w,y=rnd()*h,r=rmin+rnd()*(rmax-rmin),col=shade(base,(rnd()-.5)*amt);
    for(const dx of [0,-w,w])for(const dy of [0,-h,h]){
      const cx=x+dx,cy=y+dy;if(cx+r<0||cx-r>w||cy+r<0||cy-r>h)continue;
      const gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,rgba(col,alpha));gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(cx-r,cy-r,2*r,2*r);
    }
  }
}
function grain(g,w,h,n,amt,a){for(let i=0;i<n;i++){const v=(rnd()-.5)*amt;g.fillStyle=v>0?'rgba(255,255,255,'+Math.min(a,v/255)+')':'rgba(0,0,0,'+Math.min(a,-v/255)+')';g.fillRect(rnd()*w,rnd()*h,1+rnd()*1.4,1+rnd()*1.4)}}
function radial(size,stops){const c=canvas(size,size),g=c.getContext('2d'),r=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);stops.forEach(s=>r.addColorStop(s[0],s[1]));g.fillStyle=r;g.fillRect(0,0,size,size);return tex(c)}
const dotTex=radial(32,[[0,'#fff'],[.7,'#fff'],[1,'rgba(255,255,255,0)']]),glowTex=radial(64,[[0,'rgba(255,255,230,1)'],[1,'rgba(255,255,230,0)']]),blobTex=radial(64,[[0,'rgba(0,0,0,.6)'],[.6,'rgba(0,0,0,.25)'],[1,'rgba(0,0,0,0)']]);

function groundTex(k,lk){
  const c=canvas(512,512),g=c.getContext('2d');g.fillStyle=lk.ground;g.fillRect(0,0,512,512);
  blots(g,512,512,lk.ground,140,30,110,46,.5);blots(g,512,512,lk.ground,300,8,28,60,.5);grain(g,512,512,16000,70,.35);
  if(k==='aspal'){blots(g,512,512,'#7c9a4a',40,12,40,30,.35)}
  if(k==='batu')for(let i=0;i<500;i++){g.fillStyle=rgba(shade('#8f8470',(rnd()-.5)*80),.7);g.beginPath();g.arc(rnd()*512,rnd()*512,1+rnd()*2.4,0,7);g.fill()}
  return tex(c,[260,260]);
}
function roadTex(k,lk){
  const c=canvas(512,512),g=c.getContext('2d');g.fillStyle=lk.road;g.fillRect(0,0,512,512);
  blots(g,512,512,lk.road,90,30,120,34,.45);grain(g,512,512,k==='batu'?26000:20000,k==='batu'?90:60,.4);
  if(k==='aspal'){
    for(let i=0;i<10;i++){g.strokeStyle='rgba(15,15,15,.35)';g.lineWidth=.8+rnd();g.beginPath();let x=rnd()*512,y=rnd()*512;g.moveTo(x,y);for(let j=0;j<5;j++){x+=(rnd()-.5)*40;y+=rnd()*30;g.lineTo(x,y)}g.stroke()}   // retakan
    const wear=g.createLinearGradient(0,0,512,0);wear.addColorStop(0,'rgba(0,0,0,0)');wear.addColorStop(.3,'rgba(0,0,0,.18)');wear.addColorStop(.38,'rgba(0,0,0,0)');wear.addColorStop(.62,'rgba(0,0,0,0)');wear.addColorStop(.7,'rgba(0,0,0,.18)');wear.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=wear;g.fillRect(0,0,512,512);
    g.fillStyle='rgba(240,240,240,.93)';g.fillRect(20,0,12,512);g.fillRect(480,0,12,512);
    g.fillStyle='rgba(232,200,70,.9)';g.fillRect(253,0,7,256);
    grain(g,512,512,3000,160,.5);
  }else{
    const rut=g.createLinearGradient(0,0,512,0),col=k==='salju'?'120,135,155':k==='lumpur'?'18,10,5':'72,56,36',a=k==='lumpur'?.55:.38;
    [.2,.26,.34,.62,.7,.76].forEach((s,i)=>rut.addColorStop(s,'rgba('+col+','+(i%3===1?a:0)+')'));
    g.fillStyle=rut;g.fillRect(0,0,512,512);
    if(k==='lumpur'){blots(g,512,512,'#8a6d4b',18,10,26,40,.4)}   // genangan
    if(k==='salju'){grain(g,512,512,2500,255,.9)}
  }
  return tex(c);
}
function skyTex(lk,tm){
  const c=canvas(1024,512),g=c.getContext('2d'),mul=v=>Math.min(255,v*tm.k)|0,css=hex=>{const n=parseInt(hex.slice(1),16);return 'rgb('+mul((n>>16&255)*tm.tint[0])+','+mul((n>>8&255)*tm.tint[1])+','+mul((n&255)*tm.tint[2])+')'};
  const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,css(lk.top));gr.addColorStop(1,css(lk.hor));g.fillStyle=gr;g.fillRect(0,0,1024,256);g.fillStyle=css(lk.hor);g.fillRect(0,256,1024,256);
  const sx=.3*1024,sy=.38*512;
  if(tm.k>.3){const sg=g.createRadialGradient(sx,sy,0,sx,sy,170);sg.addColorStop(0,'rgba(255,248,225,'+(.9*tm.k+.1)+')');sg.addColorStop(.12,'rgba(255,240,200,'+(.55*tm.k)+')');sg.addColorStop(1,'rgba(255,230,180,0)');g.fillStyle=sg;g.fillRect(0,0,1024,256)}
  for(let i=0;i<(lk.cloud>0?70:0);i++){
    const x=rnd()*1024,y=50+rnd()*180,r=16+rnd()*55,a=lk.cloud*.22*(.4+tm.k);
    for(const dx of [0,-1024,1024]){const cx=x+dx;if(cx+r*2<0||cx-r*2>1024)continue;const rg=g.createRadialGradient(cx,y,0,cx,y,r);rg.addColorStop(0,'rgba(255,255,255,'+a+')');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.save();g.translate(cx,y);g.scale(2.2,.7);g.translate(-cx,-y);g.fillRect(cx-r,y-r,2*r,2*r);g.restore()}
  }
  if(tm.k<.3){for(let i=0;i<260;i++){g.fillStyle='rgba(255,255,255,'+(.3+rnd()*.7)+')';g.fillRect(rnd()*1024,rnd()*250,1+rnd(),1+rnd())}g.fillStyle='#f3f1e0';g.beginPath();g.arc(sx,sy,9,0,7);g.fill()}
  const t=tex(c,null,true);t.wrapS=THREE.RepeatWrapping;return t;
}

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
const TCX=70,TCZ=-150;
function hillH(x,z){
  const d=Math.hypot(x-TCX,z-TCZ),k=clamp01((d-430)/520),kk=k*k*(3-2*k);
  const n=(Math.sin(x*.004+1.3)*Math.cos(z*.0035+.4)*.5+.5)+(Math.sin(x*.011+z*.009)*.5+.5)*.5+(Math.sin(x*.023-z*.019+2)*.5+.5)*.2;
  return kk*n*95;
}
const SUN=new THREE.Vector3(.287,.368,.884);

function buildWorld(){
  if(world){scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose()}})}
  const lk=LOOK[modeKey],tm=TIMES[timeIdx];
  const tint=hex=>{const c=new THREE.Color(hex);c.r=Math.min(1,c.r*tm.k*tm.tint[0]);c.g=Math.min(1,c.g*tm.k*tm.tint[1]);c.b=Math.min(1,c.b*tm.k*tm.tint[2]);return c};
  world=new THREE.Group();scene.add(world);
  const hor=tint(lk.hor);fogRGB=[hor.r,hor.g,hor.b];
  scene.background=hor;scene.fog=new THREE.FogExp2(hor.getHex(),lk.fog*(timeIdx===2?1.6:1));
  // langit (dengan awan, matahari/bulan) + pantulan lingkungan untuk cat dan kaca mobil
  const st=skyTex(lk,tm);
  sky=new THREE.Mesh(new THREE.SphereGeometry(1000,48,24),new THREE.MeshBasicMaterial({map:st,side:THREE.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-1;world.add(sky);
  makeEnv(st);
  // cahaya
  world.add(new THREE.HemisphereLight(tint(lk.top).getHex(),tint(lk.ground).getHex(),.85));
  const sun=new THREE.DirectionalLight(tint(0xfff2d8).getHex(),1.0);sun.position.copy(SUN).multiplyScalar(100);world.add(sun);
  // medan: datar di sekitar lintasan, berbukit di kejauhan
  const tg=new THREE.PlaneGeometry(4200,4200,110,110);tg.rotateX(-Math.PI/2);
  const tp=tg.attributes.position,hc=new THREE.Color(lk.hill),bc=new THREE.Color(lk.ground),cols=[];
  for(let i=0;i<tp.count;i++){const h=hillH(tp.getX(i),tp.getZ(i));tp.setY(i,h-.03);const f=clamp01(h/80),c=bc.clone().lerp(hc,f);cols.push(c.r,c.g,c.b)}
  tg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));tg.computeVertexNormals();
  world.add(new THREE.Mesh(tg,new THREE.MeshLambertMaterial({map:groundTex(modeKey,lk),vertexColors:true})));
  // jalan, pinggir jalan, dinding
  const vp=trk.L/Math.round(trk.L/12);
  world.add(new THREE.Mesh(ribbon(-trk.W/2,trk.W/2,.012,vp),new THREE.MeshLambertMaterial({map:roadTex(modeKey,lk),side:THREE.DoubleSide})));
  const cp=trk.L/Math.round(trk.L/4),cc=canvas(16,64),cg=cc.getContext('2d');cg.fillStyle=lk.curb[0];cg.fillRect(0,0,16,32);cg.fillStyle=lk.curb[1];cg.fillRect(0,32,16,32);
  const cm=new THREE.MeshLambertMaterial({map:tex(cc),side:THREE.DoubleSide});
  world.add(new THREE.Mesh(ribbon(trk.W/2,trk.W/2+1.2,.022,cp),cm),new THREE.Mesh(ribbon(-trk.W/2-1.2,-trk.W/2,.022,cp),cm));
  const wm=new THREE.MeshLambertMaterial({color:lk.wall,side:THREE.DoubleSide});
  world.add(new THREE.Mesh(wallGeo(trk.W/2+MARGIN,.95),wm),new THREE.Mesh(wallGeo(-trk.W/2-MARGIN,.95),wm));
  // garis start, gerbang, spanduk
  const ang=Math.atan2(trk.tz[0],trk.tx[0]),gate=new THREE.Group();gate.position.set(trk.x[0],0,trk.z[0]);gate.rotation.y=-ang;world.add(gate);
  const kc=canvas(32,128),kg=kc.getContext('2d');for(let y=0;y<8;y++)for(let x=0;x<2;x++){kg.fillStyle=(x+y)%2?'#111':'#f2f2f2';kg.fillRect(x*16,y*16,16,16)}
  const chk=new THREE.Mesh(new THREE.PlaneGeometry(3,trk.W),new THREE.MeshLambertMaterial({map:tex(kc),side:THREE.DoubleSide}));chk.rotation.x=-Math.PI/2;chk.position.y=.03;gate.add(chk);
  const gm=new THREE.MeshLambertMaterial({color:0x2a2e38}),gb=new THREE.Mesh(new THREE.BoxGeometry(.9,1.1,trk.W+4),new THREE.MeshLambertMaterial({color:0xd83a34}));gb.position.y=6;gate.add(gb);
  [-1,1].forEach(s=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.8,6,.8),gm);p.position.set(0,3,s*(trk.W/2+2));gate.add(p)});
  const names=['TURBO','NITRO','GRIP','APEX','DRIFT','SPEED'],bcols=['#d83a34','#2f80ff','#ffd60a','#34c759','#f77f00','#7b2cbf'];
  for(let i=0;i<10;i++){
    const idx=Math.floor((.04+i*.011)*trk.N)%trk.N,side=i%2?1:-1,off=side*(trk.W/2+MARGIN+1.4),bx=trk.x[idx]-trk.tz[idx]*off,bz=trk.z[idx]+trk.tx[idx]*off;
    const bcv=canvas(256,64),bg=bcv.getContext('2d');bg.fillStyle=bcols[i%6];bg.fillRect(0,0,256,64);bg.fillStyle='#fff';bg.font='bold 40px sans-serif';bg.textAlign='center';bg.textBaseline='middle';bg.fillText(names[i%6],128,34);
    const bn=new THREE.Mesh(new THREE.PlaneGeometry(6,1.5),new THREE.MeshLambertMaterial({map:tex(bcv),side:THREE.DoubleSide}));bn.position.set(bx,1.9,bz);bn.rotation.y=side>0?Math.atan2(trk.tz[idx],-trk.tx[idx]):Math.atan2(-trk.tz[idx],trk.tx[idx]);world.add(bn);
    [-2.6,2.6].forEach(o=>{const po=new THREE.Mesh(new THREE.BoxGeometry(.12,1.9,.12),gm);po.position.set(bx+trk.tx[idx]*o,.95,bz+trk.tz[idx]*o);world.add(po)});
  }
  // pohon, semak, batu
  const R=mulberry(7),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),sc=new THREE.Vector3(),ps=new THREE.Vector3(),col=new THREE.Color();
  const spots=(n,rmin,rmax)=>{const a=[];for(let t=0;t<n*10&&a.length<n;t++){const i=Math.floor(R()*trk.N),off=(R()<.5?-1:1)*(trk.W/2+MARGIN+rmin+R()*(rmax-rmin)),x=trk.x[i]-trk.tz[i]*off,z=trk.z[i]+trk.tx[i]*off;if(distToTrack(x,z)>=trk.W/2+MARGIN+rmin-.5)a.push([x,z])}return a};
  const mat=()=>new THREE.MeshLambertMaterial({color:0xffffff});
  const inst=(geo,n)=>{const m=new THREE.InstancedMesh(geo,mat(),Math.max(1,n));m.frustumCulled=false;world.add(m);return m};
  const put=(m,i,x,y,z,sx,sy,sz,c)=>{q.setFromAxisAngle(up,R()*6.28);m4.compose(ps.set(x,y,z),q,sc.set(sx,sy,sz));m.setMatrixAt(i,m4);col.setHex(c);col.offsetHSL(0,0,(R()-.5)*.08);m.setColorAt(i,col)};
  if(lk.rocks){
    const rg=new THREE.IcosahedronGeometry(1.3,1),rp=rg.attributes.position;for(let i=0;i<rp.count;i++){const f=.8+Math.sin(rp.getX(i)*5.1+rp.getY(i)*3.7+rp.getZ(i)*4.3)*.18+Math.cos(rp.getX(i)*9)*.08;rp.setXYZ(i,rp.getX(i)*f,rp.getY(i)*f,rp.getZ(i)*f)}rg.computeVertexNormals();
    const sp=spots(230,3.5,90),im=inst(rg,sp.length);sp.forEach(([x,z],i)=>{const s=.6+R()*1.9;put(im,i,x,.5*s,z,s*(1+R()*.6),s*.75,s*(1+R()*.6),lk.leaf[i%3])});im.count=sp.length;
  }else{
    const sp=spots(300,3.5,85),pines=sp.filter(()=>R()>lk.round),rounds=sp.filter(s=>!pines.includes(s));
    const c1=inst(new THREE.ConeGeometry(1.9,3.4,12),pines.length),c2=inst(new THREE.ConeGeometry(1.4,3,12),pines.length),tr=inst(new THREE.CylinderGeometry(.22,.3,1.8,7),pines.length);
    pines.forEach(([x,z],i)=>{const s=.8+R()*1.1,c=lk.leaf[i%3];put(c1,i,x,2.9*s,z,s,s,s,c);put(c2,i,x,5*s,z,s,s,s,c);put(tr,i,x,.9*s,z,s,s,s,0x4a3524)});
    c1.count=c2.count=tr.count=pines.length;
    const rc=inst(new THREE.IcosahedronGeometry(1.7,2),rounds.length),rt=inst(new THREE.CylinderGeometry(.25,.34,2.2,7),rounds.length);
    rounds.forEach(([x,z],i)=>{const s=.8+R()*.9;put(rc,i,x,3.2*s,z,s*1.1,s,s*1.1,lk.leaf[i%3]);put(rt,i,x,1.1*s,z,s,s,s,0x4a3524)});rc.count=rt.count=rounds.length;
  }
  const bs=spots(170,1.6,14),bi=inst(new THREE.IcosahedronGeometry(.9,1),bs.length);bs.forEach(([x,z],i)=>{const s=.6+R()*.9;put(bi,i,x,.45*s,z,s*1.4,s*.8,s*1.2,lk.bush)});bi.count=bs.length;
  P.forEach(p=>{p.snow.pts.visible=false});
  skidMat.color.setHex(modeKey==='salju'?0x59636f:modeKey==='lumpur'?0x24170d:modeKey==='batu'?0x5e503b:0x111111);skidMat.opacity=modeKey==='aspal'?.45:.55;
  $('modetag')&&($('modetag').textContent=MODES[modeKey].name+' · '+tm.n);
}

/* ================= bekas ban ================= */
const NSK=1400,skidGeo=new THREE.PlaneGeometry(.3,1.1);skidGeo.rotateX(-Math.PI/2);
const skidMat=new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,fog:true});
const skidMesh=new THREE.InstancedMesh(skidGeo,skidMat,NSK);skidMesh.frustumCulled=false;scene.add(skidMesh);let skN=0;
{const m4=new THREE.Matrix4().makeTranslation(0,-100,0);for(let i=0;i<NSK;i++)skidMesh.setMatrixAt(i,m4)}
function addSkid(x,z,ang){
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion();q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2-ang);
  m4.compose(new THREE.Vector3(x,.04,z),q,new THREE.Vector3(1,1,1));skidMesh.setMatrixAt(skN++%NSK,m4);skidMesh.instanceMatrix.needsUpdate=true;
}
function clearSkids(){const m4=new THREE.Matrix4().makeTranslation(0,-100,0);for(let i=0;i<NSK;i++)skidMesh.setMatrixAt(i,m4);skidMesh.instanceMatrix.needsUpdate=true;skN=0}
function skidFor(p){
  const c=p.car,v=Math.hypot(c.vx,c.vy);
  if(v<5||(c.slipR<.2&&!c.spin))return;
  const S=c.spec,b=S.wf*S.L,cp=Math.cos(c.psi),sn=Math.sin(c.psi),wx=c.vx*cp-c.vy*sn,wz=c.vx*sn+c.vy*cp,ang=Math.atan2(wz,wx),tx=c.x-cp*b,tz=c.z-sn*b;
  if(Math.hypot(tx-(p.skx||0),tz-(p.skz||0))<.7)return;p.skx=tx;p.skz=tz;
  const w=S.Wd/2-.25;for(const s of [-1,1])addSkid(tx-sn*s*w,tz+cp*s*w,ang);
}

/* ================= mobil: bodi dari profil samping ================= */
/* x relatif sumbu belakang. belt=tinggi garis kap, nose=hidung, tail=ujung belakang, deck=bagasi/kap belakang, cowl=pangkal kaca depan,
   rf/rr=atap depan/belakang, rw=pangkal kaca belakang, wing: 0 tanpa, 1 lip, 2 sayap besar, pil=tiang tengah, tw=lebar ban */
const MODEL={
  hatch:{Ht:1.46,yg:.14,belt:.96,nose:.70,tail:.96,deck:.93,cowl:2.40,rf:1.50,rr:.10,rw:-.62,wing:0,pil:0,tw:.225,bed:0},
  sedan:{Ht:1.43,yg:.14,belt:.98,nose:.76,tail:1.02,deck:1.00,cowl:2.62,rf:1.72,rr:.52,rw:-.35,wing:1,pil:1,tw:.27,bed:0},
  coupe:{Ht:1.29,yg:.13,belt:.86,nose:.64,tail:.98,deck:.94,cowl:2.32,rf:1.38,rr:.32,rw:-.30,wing:2,pil:0,tw:.235,bed:0},
  gt:{Ht:1.37,yg:.14,belt:.94,nose:.78,tail:1.02,deck:.98,cowl:2.52,rf:1.55,rr:.32,rw:-.42,wing:1,pil:0,tw:.29,bed:0},
  super:{Ht:1.14,yg:.10,belt:.76,nose:.52,tail:.90,deck:.84,cowl:2.15,rf:1.55,rr:.50,rw:-.80,wing:2,pil:0,tw:.30,bed:0},
  rally:{Ht:1.47,yg:.20,belt:1.00,nose:.80,tail:1.04,deck:1.02,cowl:2.43,rf:1.62,rr:.50,rw:-.30,wing:2,pil:1,tw:.235,bed:0},
  pickup:{Ht:1.82,yg:.28,belt:1.20,nose:1.02,tail:1.00,deck:1.00,cowl:2.90,rf:2.50,rr:1.35,rw:1.35,wing:0,pil:1,tw:.265,bed:1},
  city:{Ht:1.50,yg:.14,belt:.92,nose:.70,tail:.95,deck:.92,cowl:2.15,rf:1.55,rr:.10,rw:-.50,wing:0,pil:0,tw:.185,bed:0}
};
function extrude(pts,width,bevel,mat,warp){
  const sh=new THREE.Shape();pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));sh.closePath();
  const d=width-2*bevel,g=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:4});
  g.translate(0,0,-d/2);
  if(warp){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)*warp(p.getX(i),p.getY(i)));g.computeVertexNormals()}
  return new THREE.Mesh(g,mat);
}
function mkCar(key,paintHex){
  const S=CARS[key],M=MODEL[key],b=S.wf*S.L,a=S.L-b,Wd=S.Wd,sh=-b,X=v=>v+sh,xr=X(-S.ohr),xf=X(S.L+S.ohf),xc=(xr+xf)/2,Lh=(xf-xr)/2;
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const paint=new THREE.MeshPhysicalMaterial({color:paintHex,metalness:.45,roughness:.3,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.1});
  const glass=new THREE.MeshStandardMaterial({color:0x0b1620,metalness:.85,roughness:.07,envMapIntensity:1.3});
  const plastic=new THREE.MeshStandardMaterial({color:0x121316,roughness:.65,metalness:.1}),chrome=new THREE.MeshStandardMaterial({color:0xd6dae0,metalness:1,roughness:.12});
  const tireM=new THREE.MeshStandardMaterial({color:0x0e0e10,roughness:.95}),rimM=new THREE.MeshStandardMaterial({color:0xc4c9d1,metalness:.95,roughness:.22});
  const lampM=new THREE.MeshStandardMaterial({color:0xdde4ea,emissive:0x000000,roughness:.2,metalness:.3}),tailM=new THREE.MeshStandardMaterial({color:0x6b0a0a,emissive:0x330000,roughness:.3});
  const box=(par,l,h,w,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(l,h,w),m);o.position.set(x,y,z);par.add(o);return o};
  const warpB=(x,y)=>(1-.09*clamp01((y-M.yg)/(M.Ht-M.yg))-.12*Math.pow(Math.abs(x-xc)/Lh,3)),warpC=(x,y)=>(1-.1*clamp01((y-M.belt)/(M.Ht-M.belt)));
  const low=[[xr,M.yg+.12],[xr,M.tail],[X(M.rw),M.deck],[X(M.cowl),M.belt],[xf-.45,M.belt-.06],[xf,M.nose],[xf,M.yg+.18],[xf-.25,M.yg],[xr+.25,M.yg]];
  body.add(extrude(low,Wd,.07,paint,warpB));
  const cabW=Wd*.88;
  body.add(extrude([[X(M.rw),M.deck],[X(M.rr),M.Ht],[X(M.rf),M.Ht],[X(M.cowl),M.belt]],cabW,.05,glass,warpC));
  const t1=(M.Ht-.07-M.belt)/(M.Ht-M.belt),t2=(M.Ht-.07-M.deck)/(M.Ht-M.deck);
  body.add(extrude([[X(M.rr),M.Ht],[X(M.rf),M.Ht],[X(M.cowl+(M.rf-M.cowl)*t1),M.Ht-.07],[X(M.rw+(M.rr-M.rw)*t2),M.Ht-.07]],cabW*.97,.03,paint,warpC));
  if(M.pil){const px=X((M.rr+M.rf)/2+ (M.bed?.2:0)),o=box(body,.09,M.Ht-M.belt-.1,cabW+.01,plastic,px,(M.Ht+M.belt)/2-.02,0);o.scale.z=1}
  // pintu: garis belahan tipis
  for(const dx of [(M.rf+M.rr)/2-.05,(M.rf+M.cowl)/2+.1])for(const s of [-1,1])box(body,.012,.5,.01,plastic,X(dx),M.belt-.28,s*(warpB(X(dx),M.belt-.28)*Wd/2+.004));
  if(M.bed){   // bak pickup
    const bx=(xr+X(M.rw))/2,bl=X(M.rw)-xr;
    for(const s of [-1,1])box(body,bl,.45,.08,paint,bx,M.deck+.22,s*(Wd/2-.06));
    box(body,.08,.45,Wd-.1,paint,xr+.05,M.deck+.22,0);box(body,.08,.45,Wd-.1,paint,X(M.rw)-.04,M.deck+.22,0);
  }
  // lampu, grill, bumper, knalpot, spion, plat nomor
  for(const s of [-1,1]){
    box(body,.1,.11,.36,lampM,xf-.04,M.nose-.14,s*(Wd/2-.32));box(body,.12,.03,.4,chrome,xf-.05,M.nose-.075,s*(Wd/2-.32));
    box(body,.1,.1,.4,tailM,xr+.03,M.tail-.12,s*(Wd/2-.3));
    box(body,.18,.07,.1,paint,X(M.cowl-.2),M.belt+.07,s*(Wd/2+.05));box(body,.05,.06,.06,plastic,X(M.cowl-.17),M.belt+.02,s*(Wd/2-.02));
    if(!M.bed){const ex=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.2,10),chrome);ex.rotation.z=Math.PI/2;ex.position.set(xr-.02,M.yg+.12,s*(Wd/2-.4));body.add(ex)}
  }
  box(body,.07,.14,Wd*.4,plastic,xf-.01,M.nose-.27,0);box(body,.18,.12,Wd*.94,plastic,xf-.07,M.yg+.2,0);box(body,.2,.1,Wd*.9,plastic,xr+.08,M.yg+.18,0);
  box(body,.02,.12,.34,new THREE.MeshStandardMaterial({color:0xeeeeee}),xf+.005,M.yg+.28,0);box(body,.02,.12,.34,new THREE.MeshStandardMaterial({color:0xeeeeee}),xr-.005,M.yg+.3,0);
  if(M.wing){   // spoiler / sayap
    const wy=M.deck+(M.wing===2?.34:.07),wx=xr+(M.wing===2?.34:.25);
    box(body,M.wing===2?.34:.22,.035,Wd*.9,plastic,wx,wy,0);
    if(M.wing===2)for(const s of [-1,1])box(body,.1,.3,.04,plastic,wx,wy-.17,s*Wd*.3);
  }
  // roda: ban, pelek 5 jari, dan lengkung roda gelap di bodi
  const wheels=[],R=S.rw,tw=M.tw;
  [[a,-1],[a,1],[-b,-1],[-b,1]].forEach(([ax,s],i)=>{
    const arch=new THREE.Mesh(new THREE.CircleGeometry(R+.08,20),new THREE.MeshBasicMaterial({color:0x050506,side:THREE.DoubleSide}));arch.position.set(ax,R,s*(warpB(ax,R)*Wd/2+.004));if(s<0)arch.rotation.y=Math.PI;body.add(arch);
    const piv=new THREE.Group();piv.position.set(ax,R,s*(Wd/2-tw/2+.02));g.add(piv);
    const spin=new THREE.Group();piv.add(spin);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(R,R,tw,24),tireM);tire.rotation.x=Math.PI/2;spin.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(R*.68,R*.68,tw+.012,20),rimM);rim.rotation.x=Math.PI/2;spin.add(rim);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(R*.2,R*.2,tw+.03,12),plastic);hub.rotation.x=Math.PI/2;spin.add(hub);
    for(let k=0;k<5;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(R*.6,R*.12,.02),plastic);sp.position.z=s*(tw/2+.012);sp.rotation.z=k*Math.PI*2/5;const gp=new THREE.Group();gp.add(sp);sp.position.x=R*.3;gp.rotation.z=k*Math.PI*2/5;sp.rotation.z=0;spin.add(gp)}
    wheels.push({piv,spin,front:ax>0});
  });
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(S.Lt*1.18,Wd*1.45),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,fog:false}));blob.rotation.x=-Math.PI/2;blob.position.set(xc,.035,0);g.add(blob);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(2.6,17,16,1,true),new THREE.MeshBasicMaterial({color:0xfff4cc,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  beam.rotation.z=Math.PI/2;beam.position.set(xf+8.5,M.nose-.1,0);g.add(beam);
  const pool=new THREE.Mesh(new THREE.PlaneGeometry(16,7.5),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  pool.rotation.x=-Math.PI/2;pool.position.set(xf+8,.07,0);g.add(pool);
  return {g,body,wheels,paint,lampM,tailM,beam,pool};
}
function updateMesh(p){
  const c=p.car,m=p.mesh;
  m.g.position.set(c.x,0,c.z);m.g.rotation.y=-c.psi;
  m.body.rotation.x=-clamp(c.ay*.004,-.07,.07);m.body.rotation.z=clamp(c.ax*.003,-.05,.05);
  m.wheels.forEach(w=>{w.spin.rotation.z=-c.wheel;if(w.front)w.piv.rotation.y=-c.delta});
  m.lampM.emissive.setHex(p.lights?0xfff2c4:0x000000);m.lampM.emissiveIntensity=p.lights?1.2:0;
  m.beam.material.opacity=p.lights?[0,.06,.14][timeIdx]:0;m.pool.material.opacity=p.lights?[0,.22,.5][timeIdx]:0;
  const br=(c.gear<0?p.in.g:p.in.b)>.2;m.tailM.emissive.setHex(br?0xff1a1a:p.lights?0x660000:0x220000);m.tailM.emissiveIntensity=br?1.6:1;
}

/* ================= partikel ================= */
const NSP=240,spPos=new Float32Array(NSP*3).fill(-999),spCol=new Float32Array(NSP*3),spVel=new Float32Array(NSP*3),spLife=new Float32Array(NSP),spBase=new Float32Array(NSP*3);let spN=0;
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));spGeo.setAttribute('color',new THREE.BufferAttribute(spCol,3));
const spPts=new THREE.Points(spGeo,new THREE.PointsMaterial({size:1.1,map:dotTex,vertexColors:true,alphaTest:.4}));spPts.frustumCulled=false;scene.add(spPts);
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
  let rate=0;
  if(modeKey==='aspal'){rate=(c.slipR>.2||c.spin)&&v>6?.8:0}
  else rate=Math.min(1,v/25)*(modeKey==='batu'?.7:modeKey==='lumpur'?.9:.8)+(c.spin?.3:0);
  p.emitAcc=(p.emitAcc||0)+rate*dt*60;
  const S=c.spec,b=S.wf*S.L,cp=Math.cos(c.psi),sn=Math.sin(c.psi);
  while(p.emitAcc>=1){
    p.emitAcc-=1;const s=rnd()<.5?-1:1,w=S.Wd/2-.2,bx=c.x-cp*b-sn*s*w,bz=c.z-sn*b+cp*s*w;
    const wx=c.vx*cp-c.vy*sn,wz=c.vx*sn+c.vy*cp;
    emit(bx,.25,bz,-wx*.15+(rnd()-.5)*2,1+rnd()*2.4,-wz*.15+(rnd()-.5)*2,lk.spray);
  }
}
function mkSnow(){
  const n=500,pos=new Float32Array(n*3);for(let i=0;i<n*3;i++)pos[i]=(rnd()-.5)*60;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.2,color:0xffffff,map:dotTex,transparent:true,alphaTest:.3,depthWrite:false,fog:false}));
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
  const c=p.car,hz=c.rpm/60*2*(c.spec.m>1900?.8:1),t=ac.currentTime,thr=c.gear<0?p.in.b:p.in.g,vol=.5/Math.max(1,active().length);
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
  p.car=createCar(g.x,g.z,g.psi,p.carKey,p.tireKey);p.car.assist=p.assist;
  p.loc=locate(trk,g.x,g.z);p.sPrev=p.loc.s;p.lap=0;p.prog=-6;p.lapT=0;p.best=null;p.last=null;
  p.finished=false;p.finT=null;p.rank=1;p.idle=0;p.wrong=false;p.camPsi=g.psi;p.bump=0;
}
function addPlayer(pid,name,kb){
  if(P.length>=4)return null;
  const ci=freeColor(),p={pid,kb,name,ci,carKey:'hatch',tireKey:'jalan',paint:PAINTS[(ci*3)%PAINTS.length],assist:.5,in:{s:0,g:0,b:0},kS:0,kG:0,lights:true,cam:0,mesh:null,camObj:new THREE.PerspectiveCamera(62,1.7,.1,1800),snow:mkSnow(),eng:null,seen:now,wait:phase==='countdown'||phase==='race'};
  p.mesh=mkCar(p.carKey,p.paint);scene.add(p.mesh.g);P.push(p);resetPlayer(p);
  if(pid!=null)sendInfo(p);
  renderLobby();return p;
}
function removePlayer(p){scene.remove(p.mesh.g);scene.remove(p.snow.pts);stopEngine(p);P.splice(P.indexOf(p),1);renderLobby()}
const canSetup=p=>phase==='lobby'||phase==='results'||p.wait;
function applySetup(p,carKey,tireKey,paint){
  let rebuild=false;
  if(CARS[carKey]&&carKey!==p.carKey){p.carKey=carKey;rebuild=true}
  if(TIRES[tireKey])p.tireKey=tireKey;
  if(typeof paint==='string'&&/^#[0-9a-f]{6}$/i.test(paint)&&paint!==p.paint){p.paint=paint;rebuild=true}
  if(rebuild){scene.remove(p.mesh.g);p.mesh=mkCar(p.carKey,p.paint);scene.add(p.mesh.g)}
  resetPlayer(p);renderLobby();
}
function onCfg(p,d){
  if(d.assist!=null){p.assist=clamp(+d.assist||0,0,1);if(p.car)p.car.assist=p.assist}
  if(canSetup(p)&&(d.car||d.tire||d.paint))applySetup(p,d.car,d.tire,d.paint);
  sendCfg(p);
}
function sendCfg(p){if(p.pid!=null)sendTo(p.pid,{t:'cfg',car:p.carKey,tire:p.tireKey,paint:p.paint,assist:p.assist,lock:!canSetup(p)})}
function sendInfo(p){sendTo(p.pid,{t:'track',pts:trkPts});sendTo(p.pid,{t:'info',ci:p.ci,name:p.name,accent:COLS[p.ci]});sendTo(p.pid,{t:'garage',cars:GARAGE.cars,tires:GARAGE.tires,paints:GARAGE.paints});sendCfg(p)}
function say(t){notice=t;noticeT=now+3}
function startRace(){
  if(!P.length){say('Belum ada pemain. Buka alamat di HP, atau tekan K untuk pemain keyboard.');return}
  P.forEach(p=>{p.wait=false});P.forEach(resetPlayer);clearSkids();
  finOrder=[];phase='countdown';cdT=3;lastCd=4;raceT=0;goT=0;unlockAudio();P.forEach(startEngine);P.forEach(sendCfg);
  $('lobby').classList.add('hide');$('results').classList.add('hide');
}
function toLobby(){
  phase='lobby';P.forEach(p=>{p.wait=false;stopEngine(p);resetPlayer(p)});clearSkids();
  $('results').classList.add('hide');$('lobby').classList.remove('hide');renderLobby();P.forEach(sendCfg);
}
function endRace(){
  phase='results';resT=14;P.forEach(stopEngine);
  const A=active().slice().sort((a,b)=>(a.finished?a.finT:1e9)-(b.finished?b.finT:1e9)||b.prog-a.prog);
  $('resBody').innerHTML=A.map((p,i)=>'<tr><td>'+(i+1)+'</td><td><i style="background:'+p.paint+'"></i>'+p.name+'<br><small>'+CARS[p.carKey].name+' · '+TIRES[p.tireKey].name+'</small></td><td>'+(p.finished?fmtTime(p.finT):'belum selesai')+'</td><td>'+fmtTime(p.best)+'</td></tr>').join('');
  $('results').classList.remove('hide');P.forEach(sendCfg);
}
function recover(p){
  const c=p.car,i=p.loc.i;c.x=trk.x[i];c.z=trk.z[i];c.psi=Math.atan2(trk.tz[i],trk.tx[i]);c.vx=c.vy=c.r=0;c.gear=1;p.idle=0;p.loc=locate(trk,c.x,c.z,i);
}
function stepPlayer(p){
  const c=p.car;
  if(phase!=='race'){c.vx=c.vy=c.r=0;return}                     // di grid mobil diam (rem tangan)
  const I=p.finished?{s:0,g:0,b:.4}:p.in;
  p.loc=locate(trk,c.x,c.z,p.loc.i);
  applySurface(c,modeKey,p.loc.off,trk.W);
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
  const c=p.car,cam=p.camObj,v=Math.hypot(c.vx,c.vy),S=c.spec;
  let d=c.psi-p.camPsi;d=Math.atan2(Math.sin(d),Math.cos(d));
  p.camPsi+=p.cam===2?d:d*(1-Math.exp(-dt*5));
  const f=p.camPsi,fx=Math.cos(f),fz=Math.sin(f),k=S.Lt/4.5;
  const sh=(MODES[modeKey].rough*v*.0012)+Math.min(.3,p.shake||0);
  p.shake=(p.shake||0)*Math.exp(-dt*6);
  if(p.cam===2){const M=MODEL[c.carKey];cam.position.set(c.x+fx*1.1,M.belt+.38+(rnd()-.5)*sh,c.z+fz*1.1);cam.lookAt(c.x+fx*30,M.belt+.25,c.z+fz*30)}
  else{
    const dist=(p.cam===0?7.2:11)*k,hh=(p.cam===0?2.5:4.2)*(.8+.2*k);
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
  else if(d.t==='cfg')onCfg(p,d);
}
function sendStates(){
  const A=active(),cars=A.map(p=>[Math.round(p.car.x),Math.round(p.car.z),p.ci]);
  for(const p of P){
    if(p.pid==null)continue;const c=p.car,S=c.spec;
    sendTo(p.pid,{t:'st',sp:Math.abs(c.vx)*3.6,g:c.gear,r:(c.rpm-S.idle)/(S.red-S.idle),l:Math.max(1,p.lap),L:laps,p:p.rank,n:A.length,
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
  let h='';for(let i=0;i<4;i++){const p=P[i];h+=p?'<div class="pl"><i style="background:'+p.paint+'"></i><div>'+p.name+(p.kb?' (keyboard)':'')+'<small>'+CARS[p.carKey].name+' · ban '+TIRES[p.tireKey].name+'</small></div></div>':'<div class="pl empty"><i></i>kosong</div>'}
  $('plist').innerHTML=h;
}
fetch('/api/info').then(r=>r.json()).then(j=>{$('url').textContent=j.url;if(window.QRCode)new QRCode($('qr'),{text:j.url,width:132,height:132})}).catch(()=>{$('url').textContent='Lihat alamat HP di jendela server.'});

/* ================= input keyboard (tes tanpa HP) ================= */
const kbPlayer=()=>P.find(p=>p.kb);
const cyc=(arr,v,d)=>arr[(arr.indexOf(v)+d+arr.length)%arr.length];
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault();unlockAudio();if(phase==='lobby')startRace();else if(phase==='results')toLobby()}
  else if(e.code==='KeyK'&&phase==='lobby'){const k=kbPlayer();if(k)removePlayer(k);else addPlayer(null,'Keyboard',true)}
  else if(e.code==='KeyQ'){qi=(qi+1)%QUALS.length;resize();say('Kualitas grafis: '+QUALS[qi].n)}
  else if(e.code==='KeyF'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();
  else if(phase==='lobby'&&/^Digit[1-4]$/.test(e.code))setMode(MODE_KEYS[+e.code[5]-1]);
  const k=kbPlayer();
  if(k){
    if(e.code==='KeyZ')onEvent(k,'down');else if(e.code==='KeyX')onEvent(k,'up');else if(e.code==='KeyL')onEvent(k,'lights');
    else if(e.code==='KeyC')onEvent(k,'cam');else if(e.code==='KeyT')onEvent(k,'auto');else if(e.code==='KeyR'&&phase==='race')recover(k);
    else if(canSetup(k)){
      if(e.code==='KeyV')applySetup(k,cyc(CAR_KEYS,k.carKey,1),k.tireKey);
      else if(e.code==='KeyB')applySetup(k,k.carKey,cyc(TIRE_KEYS,k.tireKey,1));
      else if(e.code==='KeyN')applySetup(k,k.carKey,k.tireKey,cyc(PAINTS,k.paint,1));
    }
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
  const [x,y,w,h]=r,u=Math.min(w/1.7,h)/100,c=p.car,S=c.spec,sp=Math.abs(c.vx)*3.6;
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.shadowColor='rgba(0,0,0,.75)';g.shadowBlur=6*u;
  const acc2=COLS[p.ci];
  // jam analog: rpm melingkar + kecepatan digital + gigi
  const cx=x+w-17*u,cy=y+h-17*u,R=13*u,frac=clamp01((c.rpm-S.idle)/(S.red-S.idle)),a0=.75*Math.PI,a1=2.25*Math.PI;
  g.shadowBlur=0;g.beginPath();g.arc(cx,cy,R+1.4*u,0,7);g.fillStyle='rgba(6,8,12,.55)';g.fill();
  g.lineCap='round';g.lineWidth=1.8*u;g.strokeStyle='rgba(255,255,255,.14)';g.beginPath();g.arc(cx,cy,R,a0,a1);g.stroke();
  g.strokeStyle=frac>.88?'#ff3b30':acc2;g.beginPath();g.arc(cx,cy,R,a0,a0+(a1-a0)*Math.max(.003,frac));g.stroke();
  g.strokeStyle='rgba(255,59,48,.55)';g.lineWidth=.7*u;g.beginPath();g.arc(cx,cy,R+2*u,a0+(a1-a0)*.88,a1);g.stroke();
  g.lineWidth=.35*u;g.strokeStyle='rgba(255,255,255,.45)';for(let i=0;i<=8;i++){const an=a0+(a1-a0)*i/8;g.beginPath();g.moveTo(cx+Math.cos(an)*(R-2.4*u),cy+Math.sin(an)*(R-2.4*u));g.lineTo(cx+Math.cos(an)*(R-1.1*u),cy+Math.sin(an)*(R-1.1*u));g.stroke()}
  g.shadowBlur=6*u;
  T(g,String(Math.round(sp)),cx,cy+2.2*u,9.4*u,'#fff','center',800);T(g,'km/j',cx,cy+6.4*u,2.6*u,'#aab2c2','center',600);T(g,gearTxt(c.gear),cx,cy-5.4*u,6.6*u,acc2,'center',800);
  const rank=p.rank,n=active().length;
  T(g,'P'+rank,x+5*u,y+13*u,12*u,'#fff','left',800);T(g,'/'+n,x+5*u+(rank>9?15:8.4)*u,y+13*u,5*u,'#aab2c2','left',700);
  T(g,'LAP '+Math.min(Math.max(1,p.lap),laps)+'/'+laps,x+5*u,y+19.5*u,4.2*u,'#fff','left',700);
  T(g,p.name,x+w/2,y+6*u,4.4*u,acc2,'center',700);T(g,S.name+' · '+TIRES[p.tireKey].name,x+w/2,y+10.4*u,2.9*u,'#aab2c2','center',600);
  if(phase==='race'||phase==='results'){
    const cur=p.lap>=1&&!p.finished?raceT-p.lapT:p.last;
    T(g,fmtTime(cur),x+w-5*u,y+10*u,6.6*u,'#fff','right',700);T(g,'TERBAIK '+fmtTime(p.best),x+w-5*u,y+16*u,3.6*u,'#aab2c2','right',600);
  }
  if(p.wrong&&phase==='race')T(g,'ARAH SALAH',x+w/2,y+h*.3,9*u,'#ff3b30','center',800);
  if(p.finished)T(g,'SELESAI  P'+rank,x+w/2,y+h*.3,9*u,'#ffd60a','center',800);
  if(!p.lights&&timeIdx>0)T(g,'LAMPU MATI',x+w/2,y+h*.38,3.6*u,'#ffb347','center',700);
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
  g.shadowBlur=0;T(g,Math.round(fps)+' fps · '+QUALS[qi].n,W-8,14,11,'rgba(255,255,255,.5)','right',600);
  if(now<noticeT){g.font='600 15px "Segoe UI",sans-serif';g.fillStyle='rgba(0,0,0,.6)';const tw=g.measureText(notice).width+30;g.fillRect(W/2-tw/2,H-52,tw,32);T(g,notice,W/2,H-31,15,'#fff','center',600)}
}

/* ================= render + loop ================= */
function render(){
  const A=active();renderer.setScissorTest(true);
  const lobby=phase==='lobby'||!A.length;
  if(lobby){
    const a=now*.25,cx=trk.x[0]-12*trk.tx[0],cz=trk.z[0]-12*trk.tz[0];
    orbit.aspect=W/H;orbit.position.set(cx+Math.cos(a)*10,2.6,cz+Math.sin(a)*10);orbit.lookAt(cx,.8,cz);orbit.updateProjectionMatrix();
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
      if(phase==='race'){lapLogic(p,dt);skidFor(p);if(p.bump>1){buzz(p,Math.min(250,p.bump*25));boom(p.bump);p.shake=Math.min(.35,p.bump*.03);p.bump=0}}
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
