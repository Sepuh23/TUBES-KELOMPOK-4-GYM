/* physics.js: fisika mobil, lintasan, tabrakan. Murni JavaScript (tanpa three.js) supaya bisa diuji. */
const G=9.81,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---- medan: grip (mu), hambatan gelinding (crr), kekasaran, dan kondisi di luar aspal ---- */
const MODES={
  aspal:{name:'ASPAL',mu:1.05,crr:.013,rough:0,off:{mu:.5,crr:.07}},
  salju:{name:'SALJU',mu:.36,crr:.02,rough:.08,off:{mu:.25,crr:.09}},
  lumpur:{name:'LUMPUR',mu:.5,crr:.045,rough:.2,off:{mu:.38,crr:.1}},
  batu:{name:'BEBATUAN',mu:.68,crr:.024,rough:.45,off:{mu:.5,crr:.07}}
};
const MODE_KEYS=['aspal','salju','lumpur','batu'];

/* ---- mobil: ~1200 kg, penggerak roda belakang, 6 percepatan ---- */
const CAR={m:1200,L:2.6,a:1.2,b:1.4,Iz:1800,rw:.32,fin:3.7,eta:.9,gears:[3.62,2.19,1.54,1.19,.97,.8],rev:3.4,Tmax:220,idle:900,red:7000,cda:.65,kcF:6.5,kcR:8.5};   // titik berat agak ke depan + ban depan lebih lunak = sedikit understeer
const torque=r=>CAR.Tmax*clamp(1-Math.pow((r-4800)/4200,2)*.75,.25,1);
const steerLimit=v=>clamp(1.3*G*CAR.L/Math.max(v*v,25),.012,.55);   // sudut roda maksimum menyempit saat ngebut (setir penuh ~ 1,3 g)
const ratioOf=g=>(g>0?CAR.gears[g-1]:CAR.rev)*CAR.fin;
const rpmW=c=>Math.abs(c.vx)/CAR.rw*ratioOf(c.gear)*9.5493;

function createCar(x,z,psi){
  return {x,z,psi,vx:0,vy:0,r:0,delta:0,gear:1,rpm:CAR.idle,shiftT:0,auto:true,autoT:0,revT:0,
    mu:1,crr:.013,rough:0,slip:0,spin:false,ax:0,ay:0,wheel:0};
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
      const r=Math.abs(c.vx)/CAR.rw*ratioOf(g-1)*9.5493;
      if(r<CAR.red){c.gear=g-1;c.shiftT=.2}               // pelindung over-rev
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
      if(r>6300&&c.gear<6){c.gear++;c.shiftT=.18;c.autoT=.5}
      else if(r<2200&&c.gear>1){c.gear--;c.autoT=.4}
    }
  }else if(inp.g>.5&&inp.b<.1&&Math.abs(c.vx)<.8){c.gear=1;c.autoT=.5}
}

/* satu langkah simulasi. inp={s:-1..1 (kanan +), g:gas 0..1, b:rem 0..1}. c.mu/c.crr/c.rough diisi pemanggil sesuai permukaan. */
function stepCar(c,inp,dt){
  const {m,L,a,b,Iz,rw}=CAR,Nf=m*G*b/L,Nr=m*G*a/L,v=Math.hypot(c.vx,c.vy);
  const sIn=Math.sign(inp.s)*Math.pow(Math.abs(inp.s),1.3);
  c.delta+=clamp(sIn*steerLimit(v)-c.delta,-2.2*dt,2.2*dt);
  gearLogic(c,inp,dt);
  const rat=ratioOf(c.gear),rp=rpmW(c);
  let thr=c.gear<0?inp.b:inp.g,brk=c.gear<0?inp.g:inp.b;
  if(c.shiftT>0){c.shiftT-=dt;thr=0}
  let Fd=0;
  if(rp<CAR.red)Fd=thr*torque(Math.max(rp,thr>.05?2800:CAR.idle))*rat*CAR.eta/rw;
  if(c.gear<0)Fd=-Fd;
  const eb=Math.sign(c.vx)*(20+.004*rp)*(1-thr)*rat*CAR.eta/rw*(rp>1200?1:0);
  const mu=c.mu,capF=mu*Nf,capR=mu*Nr,sv=c.vx>=0?1:-1,moving=Math.abs(c.vx)>.05?1:0;
  const Fbk=Math.min(brk*1.3*m*G,mu*m*G);                  // rem dengan ABS
  const Fxf=-sv*clamp(.6*Fbk,0,capF)*moving;
  const Fxr=clamp(Fd-sv*.4*Fbk*moving-eb,-capR,capR);
  const uF=Math.min(.98,Math.abs(Fxf)/capF),uR=Math.min(.98,Math.abs(Fxr)/capR);   // lingkaran gesekan
  const latF=capF*Math.sqrt(1-uF*uF),latR=capR*Math.sqrt(1-uR*uR);
  const cd=Math.cos(c.delta),sd=Math.sin(c.delta);
  const vxe=Math.abs(c.vx)<1.5?1.5*sv:c.vx;
  const vyf=c.vy+a*c.r,vyr=c.vy-b*c.r;
  const vl=vxe*cd+vyf*sd,vt=vyf*cd-vxe*sd;
  const alF=Math.atan2(vt,Math.max(Math.abs(vl),1.5)),alR=Math.atan2(vyr,Math.max(Math.abs(vxe),1.5));
  const sp=clamp(Math.abs(c.vx)/2.5,0,1);                   // redam gaya samping saat hampir berhenti
  const Fyw=-latF*Math.tanh(CAR.kcF*alF)*sp,Fyr=-latR*Math.tanh(CAR.kcR*alR)*sp;
  const Fyf=Fxf*sd+Fyw*cd;
  const Fxb=Fxf*cd-Fyw*sd+Fxr,Fyb=Fyf+Fyr;
  const dr=.5*1.2*CAR.cda*v;
  const Fx=Fxb-dr*c.vx-c.crr*m*G*Math.tanh(c.vx*3);
  const Fy=Fyb-dr*c.vy-m*c.vy*(1-sp)*5;
  const Mz=a*Fyf-b*Fyr-Iz*c.r*(1-sp)*5;
  const vx0=c.vx;
  c.vx+=(Fx/m+c.vy*c.r)*dt;c.vy+=(Fy/m-c.vx*c.r)*dt;c.r+=Mz/Iz*dt;
  if(vx0*c.vx<0&&(thr<.05||brk>.05))c.vx=0;
  if(c.rough)c.vy+=(Math.random()-.5)*c.rough*Math.min(v,30)*.004;
  const cp=Math.cos(c.psi),sn=Math.sin(c.psi);
  c.x+=(c.vx*cp-c.vy*sn)*dt;c.z+=(c.vx*sn+c.vy*cp)*dt;c.psi+=c.r*dt;
  c.wheel+=c.vx/rw*dt;
  c.slip=Math.max(Math.abs(alF),Math.abs(alR));
  c.spin=Math.abs(Fd)>capR*.98;
  c.ax=Fx/m;c.ay=Fy/m;
  const tr=Math.max(rp,thr>.05?2200+thr*1500:CAR.idle);
  c.rpm+=(Math.min(CAR.red+150,tr)-c.rpm)*Math.min(1,dt*10);
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

/* ---- tabrakan ---- */
const worldV=c=>{const cp=Math.cos(c.psi),sn=Math.sin(c.psi);return [c.vx*cp-c.vy*sn,c.vx*sn+c.vy*cp]};
const setWorldV=(c,X,Z)=>{const cp=Math.cos(c.psi),sn=Math.sin(c.psi);c.vx=X*cp+Z*sn;c.vy=-X*sn+Z*cp};
function collideCars(A,B){
  let hit=0;
  const circ=c=>{const cp=Math.cos(c.psi),sn=Math.sin(c.psi);return [[c.x+cp,c.z+sn],[c.x-cp,c.z-sn]]};
  for(const pa of circ(A))for(const pb of circ(B)){
    const dx=pb[0]-pa[0],dz=pb[1]-pa[1],d=Math.hypot(dx,dz),R=1.9;
    if(d<R&&d>1e-4){
      const nx=dx/d,nz=dz/d,ov=R-d;
      A.x-=nx*ov*.5;A.z-=nz*ov*.5;B.x+=nx*ov*.5;B.z+=nz*ov*.5;
      const va=worldV(A),vb=worldV(B),rel=(vb[0]-va[0])*nx+(vb[1]-va[1])*nz;
      if(rel<0){const j=-1.25*rel/2;setWorldV(A,va[0]-j*nx,va[1]-j*nz);setWorldV(B,vb[0]+j*nx,vb[1]+j*nz);hit=Math.max(hit,-rel)}
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
/* permukaan di bawah mobil: di jalan atau di luar jalan (transisi halus 1 m di tepi) */
function applySurface(c,mode,off,W){
  const k=clamp((Math.abs(off)-W/2)/1+.5,0,1);
  c.mu=mode.mu+(mode.off.mu-mode.mu)*k;c.crr=mode.crr+(mode.off.crr-mode.crr)*k;c.rough=mode.rough*(1+k);
}
const fmtTime=t=>{if(t==null||!isFinite(t))return '--:--.--';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2)};
