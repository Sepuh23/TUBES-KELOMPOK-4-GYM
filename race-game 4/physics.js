/* physics.js v2: fisika mobil (8 mobil, 6 ban), lintasan, tabrakan. Murni JavaScript (tanpa three.js) supaya bisa diuji. */
const G=9.81,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),REV=3.4;

/* ---- medan: grip dasar (mu), hambatan gelinding (crr), kekasaran, dan kondisi di luar aspal ---- */
const MODES={
  aspal:{name:'ASPAL',mu:1.05,crr:.013,rough:0,off:{mu:.5,crr:.07}},
  salju:{name:'SALJU',mu:.36,crr:.02,rough:.08,off:{mu:.25,crr:.09}},
  lumpur:{name:'LUMPUR',mu:.5,crr:.045,rough:.2,off:{mu:.38,crr:.1}},
  batu:{name:'BEBATUAN',mu:.68,crr:.024,rough:.45,off:{mu:.5,crr:.07}}
};
const MODE_KEYS=['aspal','salju','lumpur','batu'];

/* ---- ban: pengali grip per medan (m), faktor roda depan/belakang (f, r), kekakuan (kf, kr), bantuan drift ---- */
const TIRES={
  jalan:{name:'Jalan',desc:'Seimbang dan mudah dikendalikan.',m:{aspal:1.15,salju:.85,lumpur:.9,batu:.95},f:1,r:1,kf:7.5,kr:9,drift:0},
  grip:{name:'Grip (Racing)',desc:'Cengkeraman maksimum di aspal, buruk di salju dan lumpur.',m:{aspal:1.5,salju:.55,lumpur:.6,batu:.7},f:1,r:1.02,kf:9,kr:10.5,drift:0},
  drift:{name:'Drift',desc:'Ban belakang lebih licin tapi terkendali, ada bantuan kontra-setir.',m:{aspal:1,salju:.85,lumpur:.9,batu:.95},f:1,r:.78,kf:8,kr:7.5,drift:.6},
  slip:{name:'Slip (Licin)',desc:'Grip sangat rendah: mobil meluncur seperti di es.',m:{aspal:.55,salju:.55,lumpur:.6,batu:.6},f:1,r:1,kf:6,kr:6.5,drift:0},
  rally:{name:'Rally',desc:'Terbaik di kerikil dan lumpur, cukup baik di aspal.',m:{aspal:.95,salju:1.05,lumpur:1.35,batu:1.35},f:1,r:1,kf:7,kr:8,drift:0},
  salju:{name:'Salju (musim dingin)',desc:'Terbaik di salju dan lumpur, biasa saja di aspal.',m:{aspal:.9,salju:1.6,lumpur:1.2,batu:1},f:1,r:1,kf:7,kr:8.5,drift:0}
};
const TIRE_KEYS=['jalan','grip','drift','slip','rally','salju'];

/* ---- mobil: data mirip kelas mobil nyata. wf = porsi bobot di roda depan, h = tinggi titik berat, split = porsi tenaga ke belakang (AWD) ---- */
const CARS={
  hatch:{name:'Hot Hatch',desc:'Kecil, lincah, penggerak depan.',drv:'FWD',split:0,m:1330,L:2.63,wf:.61,h:.52,Tmax:345,pk:3400,tk:.25,red:6700,idle:850,gears:[3.62,2.19,1.51,1.17,.93,.76],fin:4,rw:.33,cda:0.68,dn:0,brk:1.25,bias:.66,lock:.55,Lt:4.27,Wd:1.80,ohf:.86,ohr:.78},
  sedan:{name:'Sedan Sport',desc:'Bertenaga besar, penggerak belakang, mudah drift.',drv:'RWD',split:1,m:1620,L:2.85,wf:.52,h:.5,Tmax:550,pk:4200,tk:.2,red:7600,idle:900,gears:[4.11,2.32,1.54,1.18,1,.85],fin:3.15,rw:.34,cda:0.78,dn:.08,brk:1.3,bias:.62,lock:.55,Lt:4.80,Wd:1.90,ohf:.93,ohr:1.02},
  coupe:{name:'Coupe Ringan',desc:'Ringan dan seimbang, penggerak belakang, favorit drift.',drv:'RWD',split:1,m:1250,L:2.57,wf:.54,h:.46,Tmax:250,pk:6400,tk:.5,red:7400,idle:900,gears:[3.62,2.19,1.54,1.29,1,.77],fin:4.1,rw:.32,cda:0.7,dn:.05,brk:1.25,bias:.6,lock:.56,Lt:4.24,Wd:1.78,ohf:.93,ohr:.74},
  gt:{name:'GT AWD',desc:'Berat dan sangat cepat, penggerak semua roda.',drv:'AWD',split:.6,m:1750,L:2.78,wf:.54,h:.5,Tmax:630,pk:4000,tk:0.1,red:7000,idle:900,gears:[4.06,2.3,1.59,1.25,1,.8],fin:3.3,rw:.34,cda:0.74,dn:.3,brk:1.4,bias:.6,lock:.55,Lt:4.70,Wd:1.90,ohf:.93,ohr:.99},
  super:{name:'Supercar',desc:'Mesin tengah, downforce besar, tenaga ekstrem.',drv:'AWD',split:.7,m:1450,L:2.7,wf:.43,h:.42,Tmax:600,pk:6000,tk:0.22,red:8500,idle:1000,gears:[3.08,2.19,1.63,1.29,1.03,.84],fin:3.9,rw:.34,cda:.55,dn:.9,brk:1.6,bias:.58,lock:.5,Lt:4.50,Wd:1.95,ohf:.95,ohr:.85},
  rally:{name:'Mobil Rally',desc:'Penggerak semua roda, tinggi dan kuat di medan berat.',drv:'AWD',split:.5,m:1450,L:2.67,wf:.57,h:.55,Tmax:350,pk:3800,tk:.22,red:6800,idle:900,gears:[3.45,2.2,1.55,1.2,.95,.78],fin:4.4,rw:.34,cda:0.8,dn:.1,brk:1.3,bias:.62,lock:.6,Lt:4.60,Wd:1.82,ohf:.92,ohr:1.01},
  pickup:{name:'Pickup 4x4',desc:'Berat dan tinggi, kuat di lumpur dan salju, lambat di aspal.',drv:'AWD',split:.5,m:2150,L:3.09,wf:.55,h:.8,Tmax:500,pk:1900,tk:.5,red:4800,idle:750,gears:[4.7,2.8,1.8,1.3,1,.8],fin:4.1,rw:.4,cda:1.05,dn:0,brk:1,bias:.6,lock:.6,Lt:5.30,Wd:1.86,ohf:.98,ohr:1.23},
  city:{name:'Mobil Kota',desc:'Mungil dan irit, penggerak depan, cocok untuk pemula.',drv:'FWD',split:0,m:1050,L:2.4,wf:.63,h:.5,Tmax:165,pk:4200,tk:.35,red:6600,idle:900,gears:[3.55,1.95,1.3,1,.8,.67],fin:4.2,rw:.3,cda:0.7,dn:0,brk:1.2,bias:.66,lock:.58,Lt:3.60,Wd:1.68,ohf:.62,ohr:.58}
};
const CAR_KEYS=['hatch','sedan','coupe','gt','super','rally','pickup','city'];
for(const k of CAR_KEYS){const s=CARS[k];s.eta=.9;s.Iz=s.m*Math.pow(.46*s.L,2);s.span=(s.red-s.idle)/2}

const torque=(S,r)=>S.Tmax*clamp(1-Math.pow((r-S.pk)/S.span,2)*S.tk,.35,1);
const steerLimit=(v,S)=>clamp(2*G*S.L/Math.max(v*v,25),.012,S.lock);   // sudut roda maks menyempit saat ngebut (setir penuh menuntut ~ 2 g)
const ratioOf=(c,g)=>(g>0?c.spec.gears[g-1]:REV)*c.spec.fin;
const rpmW=c=>Math.abs(c.vx)/c.spec.rw*ratioOf(c,c.gear)*9.5493;
const hpOf=S=>{let p=0;for(let r=S.idle;r<=S.red;r+=50)p=Math.max(p,torque(S,r)*r/9.5493);return p/745.7};

function createCar(x,z,psi,carKey,tireKey){
  const spec=CARS[carKey||'hatch'];
  return {x,z,psi,vx:0,vy:0,r:0,delta:0,gear:1,rpm:spec.idle,shiftT:0,auto:true,autoT:0,revT:0,spec,tire:TIRES[tireKey||'jalan'],carKey:carKey||'hatch',tireKey:tireKey||'jalan',
    assist:.5,mu:1,crr:.013,rough:0,slip:0,slipR:0,spin:false,ax:0,axs:0,ay:0,wheel:0};
}
function setSetup(c,carKey,tireKey){
  if(CARS[carKey]&&carKey!==c.carKey){c.carKey=carKey;c.spec=CARS[carKey];c.gear=1;c.rpm=c.spec.idle}
  if(TIRES[tireKey]){c.tireKey=tireKey;c.tire=TIRES[tireKey]}
}
function shiftGear(c,d){
  const g=c.gear;
  if(c.auto)c.auto=false;                                 // menarik paddle = pindah ke manual
  if(d>0){
    if(g===-1){if(Math.abs(c.vx)<2)c.gear=1}
    else if(g<6){c.gear=g+1;c.shiftT=.2}
  }else{
    if(g===1){if(Math.abs(c.vx)<2)c.gear=-1}
    else if(g>1){
      const r=Math.abs(c.vx)/c.spec.rw*ratioOf(c,g-1)*9.5493;
      if(r<c.spec.red){c.gear=g-1;c.shiftT=.2}            // pelindung over-rev
    }
  }
}
function gearLogic(c,inp,dt){
  if(!c.auto)return;
  if(c.gear>0){
    if(inp.b>.5&&inp.g<.1&&c.vx<.6){c.revT+=dt;if(c.revT>.4){c.gear=-1;c.revT=0}}else c.revT=0;
    c.autoT-=dt;
    if(c.autoT<=0){
      const r=rpmW(c);
      if(r>c.spec.red*.92&&c.gear<6){c.gear++;c.shiftT=.18;c.autoT=.5}
      else if(r<c.spec.red*.3&&c.gear>1){c.gear--;c.autoT=.4}
    }
  }else if(inp.g>.5&&inp.b<.1&&Math.abs(c.vx)<.8){c.gear=1;c.autoT=.5}
}

/* satu langkah simulasi. inp={s:-1..1 (kanan +), g:gas 0..1, b:rem 0..1}. c.mu/c.crr/c.rough diisi lewat applySurface. */
function stepCar(c,inp,dt){
  const S=c.spec,T=c.tire,m=S.m,L=S.L,b=S.wf*L,a=L-b,rw=S.rw,Iz=S.Iz,W=m*G,v=Math.hypot(c.vx,c.vy);
  // setir (+ bantuan kontra-setir pada ban drift)
  const sIn=Math.sign(inp.s)*Math.pow(Math.abs(inp.s),1.3);
  let dT=sIn*steerLimit(v,S);
  if(T.drift>0&&c.vx>4)dT+=T.drift*clamp(Math.atan2(c.vy,c.vx),-.5,.5)*steerLimit(Math.max(v,12),S)*1.8;   // kontra-setir otomatis, sebanding dengan batas setir
  dT=clamp(dT,-S.lock,S.lock);
  c.delta+=clamp(dT-c.delta,-2.2*dt,2.2*dt);
  gearLogic(c,inp,dt);
  const rat=ratioOf(c,c.gear),rp=rpmW(c);
  let thr=c.gear<0?inp.b:inp.g,brk=c.gear<0?inp.g:inp.b;
  if(c.shiftT>0){c.shiftT-=dt;thr=0}
  let Fd=0;
  if(rp<S.red)Fd=thr*torque(S,Math.max(rp,thr>.05?Math.min(S.red*.45,3200):S.idle))*rat*S.eta/rw;
  if(c.gear<0)Fd=-Fd;
  const eb=Math.sign(c.vx)*(20+.004*rp)*(1-thr)*rat*S.eta/rw*(rp>S.idle*1.3?1:0);
  const rf=S.drv==='FWD'?0:S.drv==='RWD'?1:S.split;
  // beban sumbu: bobot statis + downforce + perpindahan beban saat akselerasi/pengereman
  const dn=S.dn*v*v,dN=m*c.axs*S.h/L;
  const Nf=clamp(W*S.wf+dn/2-dN,.12*W,.95*W),Nr=clamp(W*(1-S.wf)+dn/2+dN,.12*W,.95*W);
  const mu=c.mu,capF=mu*T.f*Nf,capR=mu*T.r*Nr,sv=c.vx>=0?1:-1,moving=Math.abs(c.vx)>.05?1:0;
  const Fbk=Math.min(brk*S.brk*W,capF+capR);                // rem dengan ABS
  const Fxf=clamp(Fd*(1-rf)-eb*(1-rf)-sv*S.bias*Fbk*moving,-capF,capF);
  const Fxr=clamp(Fd*rf-eb*rf-sv*(1-S.bias)*Fbk*moving,-capR,capR);
  const uF=Math.min(.98,Math.abs(Fxf)/capF),uR=Math.min(.98,Math.abs(Fxr)/capR);   // lingkaran gesekan
  const latF=capF*Math.sqrt(1-uF*uF),latR=capR*Math.sqrt(1-uR*uR);
  const cd=Math.cos(c.delta),sd=Math.sin(c.delta);
  const vxe=Math.abs(c.vx)<1.5?1.5*sv:c.vx;
  const vyf=c.vy+a*c.r,vyr=c.vy-b*c.r;
  const vl=vxe*cd+vyf*sd,vt=vyf*cd-vxe*sd;
  const alF=Math.atan2(vt,Math.max(Math.abs(vl),1.5)),alR=Math.atan2(vyr,Math.max(Math.abs(vxe),1.5));
  const sp=clamp(Math.abs(c.vx)/2.5,0,1);                   // redam gaya samping saat hampir berhenti
  const Fyw=-latF*Math.tanh(T.kf*alF)*sp,Fyr=-latR*Math.tanh(T.kr*alR)*sp;
  const Fyf=Fxf*sd+Fyw*cd;
  const Fxb=Fxf*cd-Fyw*sd+Fxr,Fyb=Fyf+Fyr;
  const dr=.5*1.2*S.cda*v;
  const Fx=Fxb-dr*c.vx-c.crr*W*Math.tanh(c.vx*3);
  const Fy=Fyb-dr*c.vy-m*c.vy*(1-sp)*5;
  let Mz=a*Fyf-b*Fyr-Iz*c.r*(1-sp)*5;
  if(c.assist>0&&c.vx>3){                                  // bantuan stabilitas (ESC): luruskan badan mobil dan redam putaran
    const be=Math.atan2(c.vy,Math.max(c.vx,1)),k=c.assist*(T.drift>0?.5:1)*clamp((c.vx-3)/10,0,1);
    Mz+=k*Iz*(12*clamp(be,-.5,.5)-2.5*c.r*clamp(Math.abs(be)/.2,0,1));
  }
  const vx0=c.vx;
  c.vx+=(Fx/m+c.vy*c.r)*dt;c.vy+=(Fy/m-c.vx*c.r)*dt;c.r+=Mz/Iz*dt;
  if(vx0*c.vx<0&&(thr<.05||brk>.05))c.vx=0;
  if(c.rough)c.vy+=(Math.random()-.5)*c.rough*Math.min(v,30)*.004;
  const cp=Math.cos(c.psi),sn=Math.sin(c.psi);
  c.x+=(c.vx*cp-c.vy*sn)*dt;c.z+=(c.vx*sn+c.vy*cp)*dt;c.psi+=c.r*dt;
  c.wheel+=c.vx/rw*dt;
  c.slip=Math.max(Math.abs(alF),Math.abs(alR));c.slipR=Math.abs(alR);
  c.spin=Math.abs(Fd*rf)>capR*.98||Math.abs(Fd*(1-rf))>capF*.98;
  c.ax=Fx/m;c.axs+=(c.ax-c.axs)*Math.min(1,dt*15);c.ay=Fy/m;
  const tr=Math.max(rp,thr>.05?2200+thr*1500:S.idle);
  c.rpm+=(Math.min(S.red+150,tr)-c.rpm)*Math.min(1,dt*10);
}

/* ---- lintasan: spline Catmull-Rom tertutup, di-sampel merata per jarak ---- */
const CONTROL=[[0,0],[120,0],[220,-10],[300,-60],[330,-150],[290,-230],[200,-260],[120,-220],[60,-250],[-30,-300],[-130,-280],[-190,-200],[-170,-110],[-90,-60]];
function buildTrack(ctrl,W,N,start){
  ctrl=ctrl||CONTROL;W=W||14;N=N||360;start=start||[60,0];
  const M=ctrl.length,fine=[],per=40,cr=(a,b,c,d,t)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for(let i=0;i<M;i++){
    const p0=ctrl[(i+M-1)%M],p1=ctrl[i],p2=ctrl[(i+1)%M],p3=ctrl[(i+2)%M];
    for(let k=0;k<per;k++){const t=k/per;fine.push([cr(p0[0],p1[0],p2[0],p3[0],t),cr(p0[1],p1[1],p2[1],p3[1],t)])}
  }
  const F=fine.length,cum=[0];
  for(let i=1;i<=F;i++){const a=fine[i-1],b=fine[i%F];cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}
  const L=cum[F],raw=[];
  let k=0;
  for(let j=0;j<N;j++){
    const tgt=j*L/N;while(cum[k+1]<tgt)k++;
    const a=fine[k],b=fine[(k+1)%F],u=(tgt-cum[k])/(cum[k+1]-cum[k]||1);
    raw.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);
  }
  let k0=0,bd=1e18;
  raw.forEach((p,i)=>{const d=Math.hypot(p[0]-start[0],p[1]-start[1]);if(d<bd){bd=d;k0=i}});
  const t={N,L,W,x:[],z:[],tx:[],tz:[],s:[],kap:[]};
  for(let i=0;i<N;i++){const p=raw[(k0+i)%N];t.x.push(p[0]);t.z.push(p[1]);t.s.push(i*L/N)}
  for(let i=0;i<N;i++){
    const a=(i+N-1)%N,b=(i+1)%N,dx=t.x[b]-t.x[a],dz=t.z[b]-t.z[a],l=Math.hypot(dx,dz)||1;
    t.tx.push(dx/l);t.tz.push(dz/l);
  }
  for(let i=0;i<N;i++){
    const b=(i+1)%N,h0=Math.atan2(t.tz[i],t.tx[i]),h1=Math.atan2(t.tz[b],t.tx[b]);
    t.kap.push(Math.atan2(Math.sin(h1-h0),Math.cos(h1-h0))/(L/N));     // positif = belok kanan
  }
  const raw2=t.kap.slice();                                            // haluskan (rata-rata +-4 titik) agar tidak berisik
  for(let i=0;i<N;i++){let a=0;for(let k=-4;k<=4;k++)a+=raw2[(i+k+N)%N];t.kap[i]=a/9}
  return t;
}
/* posisi pada lintasan: indeks terdekat (cari di sekitar hint, atau seluruhnya bila hint kosong), jarak s, simpangan (kanan +) */
function locate(trk,x,z,hint){
  const N=trk.N;let best=0,bd=1e18;
  if(hint==null){for(let i=0;i<N;i++){const dx=x-trk.x[i],dz=z-trk.z[i],d=dx*dx+dz*dz;if(d<bd){bd=d;best=i}}}
  else for(let k=-14;k<=14;k++){const i=(hint+k+N)%N,dx=x-trk.x[i],dz=z-trk.z[i],d=dx*dx+dz*dz;if(d<bd){bd=d;best=i}}
  const tx=trk.tx[best],tz=trk.tz[best],dx=x-trk.x[best],dz=z-trk.z[best];
  let s=trk.s[best]+dx*tx+dz*tz;s=((s%trk.L)+trk.L)%trk.L;
  return {i:best,s,off:-dx*tz+dz*tx};
}

/* ---- tabrakan: dua lingkaran per mobil, massa ikut diperhitungkan ---- */
const worldV=c=>{const cp=Math.cos(c.psi),sn=Math.sin(c.psi);return [c.vx*cp-c.vy*sn,c.vx*sn+c.vy*cp]};
const setWorldV=(c,X,Z)=>{const cp=Math.cos(c.psi),sn=Math.sin(c.psi);c.vx=X*cp+Z*sn;c.vy=-X*sn+Z*cp};
function circles(c){
  const S=c.spec,b=S.wf*S.L,a=S.L-b,cx=(a-b)/2+(S.ohf-S.ohr)/2,off=S.Lt/2-S.Wd/2,cp=Math.cos(c.psi),sn=Math.sin(c.psi),R=S.Wd/2;
  return [[c.x+cp*(cx+off),c.z+sn*(cx+off),R],[c.x+cp*(cx-off),c.z+sn*(cx-off),R]];
}
function collideCars(A,B){
  let hit=0;const ma=A.spec.m,mb=B.spec.m;
  for(const pa of circles(A))for(const pb of circles(B)){
    const dx=pb[0]-pa[0],dz=pb[1]-pa[1],d=Math.hypot(dx,dz),R=pa[2]+pb[2];
    if(d<R&&d>1e-4){
      const nx=dx/d,nz=dz/d,ov=R-d,wa=mb/(ma+mb),wb=ma/(ma+mb);
      A.x-=nx*ov*wa;A.z-=nz*ov*wa;B.x+=nx*ov*wb;B.z+=nz*ov*wb;
      const va=worldV(A),vb=worldV(B),rel=(vb[0]-va[0])*nx+(vb[1]-va[1])*nz;
      if(rel<0){const j=-1.25*rel/(1/ma+1/mb);setWorldV(A,va[0]-j/ma*nx,va[1]-j/ma*nz);setWorldV(B,vb[0]+j/mb*nx,vb[1]+j/mb*nz);hit=Math.max(hit,-rel)}
    }
  }
  return hit;
}
function wallCollide(c,trk,loc,margin){
  const lim=trk.W/2+margin;
  if(Math.abs(loc.off)<=lim)return 0;
  const sg=Math.sign(loc.off),nx=-trk.tz[loc.i]*sg,nz=trk.tx[loc.i]*sg,over=Math.abs(loc.off)-lim;
  c.x-=nx*over;c.z-=nz*over;
  const V=worldV(c),vn=V[0]*nx+V[1]*nz;
  if(vn>0){setWorldV(c,(V[0]-1.2*vn*nx)*.92,(V[1]-1.2*vn*nz)*.92);return vn}
  return 0;
}
/* permukaan di bawah mobil = medan x ban; di luar aspal grip turun (transisi halus 1 m di tepi) */
function applySurface(c,key,off,W){
  const M=MODES[key],tm=c.tire.m[key],k=clamp((Math.abs(off)-W/2)/1+.5,0,1);
  c.mu=(M.mu+(M.off.mu-M.mu)*k)*tm;c.crr=M.crr+(M.off.crr-M.crr)*k;c.rough=M.rough*(1+k);
}
const fmtTime=t=>{if(t==null||!isFinite(t))return '--:--.--';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2)};

/* statistik mobil di aspal (disimulasikan, bukan angka karangan): 0-100 km/j, kecepatan maks, rem 100-0 */
function carStats(key,tire){
  const dt=1/120,res={hp:Math.round(hpOf(CARS[key]))};
  let c=createCar(0,0,0,key,tire||'jalan'),t=0;
  for(;t<40;t+=dt){applySurface(c,'aspal',0,14);stepCar(c,{s:0,g:1,b:0},dt);if(c.vx>=27.78)break}
  res.t100=t>=40?null:+t.toFixed(1);
  c=createCar(0,0,0,key,tire||'jalan');let best=0;
  for(t=0;t<70;t+=dt){applySurface(c,'aspal',0,14);stepCar(c,{s:0,g:1,b:0},dt);best=Math.max(best,c.vx)}
  res.vmax=Math.round(best*3.6);
  c=createCar(0,0,0,key,tire||'jalan');c.vx=27.78;c.gear=4;let d=0;
  for(t=0;t<20&&c.vx>.1;t+=dt){applySurface(c,'aspal',0,14);const x0=c.x;stepCar(c,{s:0,g:0,b:1},dt);d+=c.x-x0}
  res.brake=Math.round(d);
  return res;
}
