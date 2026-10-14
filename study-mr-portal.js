import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/controls/OrbitControls.js';
import {ARButton} from 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/webxr/ARButton.js';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.setClearColor(0xffffff,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.03,150);camera.position.set(0,1.6,3.6);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.45,-1.8);controls.enableDamping=true;controls.maxDistance=7;controls.minDistance=2.4;
const experience=new THREE.Group();scene.add(experience);
scene.add(new THREE.HemisphereLight(0xffffff,0x303030,1.7));const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-4,7,5);scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,1.4);rim.position.set(5,4,-5);scene.add(rim);

const arButton=ARButton.createButton(renderer,{optionalFeatures:['hand-tracking','local-floor']});arButton.textContent='ENTER MR';document.body.append(arButton);
const loader=new GLTFLoader();const status=document.querySelector('#status'),bar=document.querySelector('#bar');
let ready=false,running=false,t0=0,forceTime=null,sessionAligned=false;
let hero,fragments,portalWorld,fullWorld,breakouts=[],maskedStones=[];
const DURATION=58;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));const smooth=t=>t*t*(3-2*t);const seg=(t,a,b)=>smooth(clamp((t-a)/(b-a)));

function mineral(root,color=0x080808,rough=.82,masked=false){root.traverse(o=>{if(!o.isMesh)return;const arr=Array.isArray(o.material)?o.material:[o.material];o.material=arr.map(src=>{const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0,side:THREE.DoubleSide});m.normalMap=src?.normalMap||null;if(m.normalMap)m.normalScale.set(.4,.4);if(masked){m.stencilWrite=true;m.stencilRef=1;m.stencilFunc=THREE.EqualStencilFunc;m.stencilFail=THREE.KeepStencilOp;m.stencilZFail=THREE.KeepStencilOp;m.stencilZPass=THREE.KeepStencilOp;}return m;});if(o.material.length===1)o.material=o.material[0];});}
function solid(root,color,masked=false){root.traverse(o=>{if(!o.isMesh)return;const m=new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0,side:THREE.DoubleSide});if(masked){m.stencilWrite=true;m.stencilRef=1;m.stencilFunc=THREE.EqualStencilFunc;m.stencilZPass=THREE.KeepStencilOp;}o.material=m;});}

const portal=new THREE.Group();portal.position.set(0,1.45,-1.85);experience.add(portal);
const maskMat=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilFail:THREE.ReplaceStencilOp,stencilZFail:THREE.ReplaceStencilOp,stencilZPass:THREE.ReplaceStencilOp});
const mask=new THREE.Mesh(new THREE.CircleGeometry(1,128),maskMat);mask.renderOrder=-10;portal.add(mask);
const ringOuter=new THREE.Mesh(new THREE.TorusGeometry(1.045,.055,16,128),new THREE.MeshStandardMaterial({color:0x050505,roughness:.9,metalness:0}));portal.add(ringOuter);
const ringInner=new THREE.Mesh(new THREE.TorusGeometry(.975,.018,12,128),new THREE.MeshBasicMaterial({color:0xffffff}));portal.add(ringInner);
portal.scale.setScalar(.001);portal.visible=true;

const voidSphere=new THREE.Mesh(new THREE.SphereGeometry(18,48,24),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide}));voidSphere.scale.setScalar(.001);experience.add(voidSphere);

const anchor=new THREE.Group();anchor.position.set(0,1.42,-1.55);experience.add(anchor);

async function load(){
 status.textContent='LOADING 01 / 03';
 const [h,f,m]=await Promise.all([
  loader.loadAsync('./assets/hero-high.glb'),loader.loadAsync('./assets/fragments-capped-web.glb'),loader.loadAsync('./assets/mountain-web.glb')
 ]);
 status.textContent='BUILDING MR STUDY';
 hero=h.scene;mineral(hero,0x070707,.86,false);hero.scale.setScalar(.13);hero.rotation.set(.2,.5,-.2);anchor.add(hero);

 portalWorld=new THREE.Group();experience.add(portalWorld);
 const near=m.scene.clone(true);mineral(near,0x080808,.88,true);near.scale.setScalar(.48);near.position.set(0,2.5,-8.5);near.rotation.set(Math.PI*.92,.08,.04);portalWorld.add(near);
 const mid=m.scene.clone(true);solid(mid,0x555555,true);mid.scale.setScalar(.32);mid.position.set(-2,-.7,-12);portalWorld.add(mid);
 const far=m.scene.clone(true);solid(far,0xbcbcbc,true);far.scale.setScalar(.24);far.position.set(3,-.5,-17);portalWorld.add(far);

 fragments=f.scene;const sourceMeshes=[];fragments.traverse(o=>{if(o.isMesh)sourceMeshes.push(o);});
 for(let i=0;i<Math.min(12,sourceMeshes.length);i++){
  const s=sourceMeshes[i].clone();s.geometry=sourceMeshes[i].geometry;mineral(s,0x090909,.88,true);const a=i/12*Math.PI*2;s.position.set(Math.cos(a)*1.6,1.4+Math.sin(a*2)*.65,-4.0-Math.sin(a)*.6);s.scale.setScalar(.08+(i%3)*.018);portalWorld.add(s);maskedStones.push(s);
 }

 for(let i=0;i<Math.min(5,sourceMeshes.length);i++){
  const s=sourceMeshes[(i*2)%sourceMeshes.length].clone();s.geometry=sourceMeshes[(i*2)%sourceMeshes.length].geometry;mineral(s,0x070707,.9,false);s.scale.setScalar(.001);experience.add(s);breakouts.push(s);
 }

 fullWorld=new THREE.Group();experience.add(fullWorld);fullWorld.visible=false;
 const over=m.scene.clone(true);mineral(over,0x050505,.9,false);over.scale.setScalar(.62);over.position.set(0,4.4,-5.0);over.rotation.set(Math.PI*.94,.03,0);fullWorld.add(over);
 const sideL=m.scene.clone(true);solid(sideL,0x3d3d3d,false);sideL.scale.setScalar(.35);sideL.position.set(-8,-.4,-12);fullWorld.add(sideL);
 const sideR=m.scene.clone(true);solid(sideR,0x626262,false);sideR.scale.setScalar(.3);sideR.position.set(7,-.7,-15);fullWorld.add(sideR);
 const distant=m.scene.clone(true);solid(distant,0xc8c8c8,false);distant.scale.setScalar(.23);distant.position.set(0,-.5,-21);fullWorld.add(distant);
 for(let i=0;i<8;i++){const s=sourceMeshes[i%sourceMeshes.length].clone();s.geometry=sourceMeshes[i%sourceMeshes.length].geometry;mineral(s,0x090909,.9,false);const a=i/8*Math.PI*2;s.position.set(Math.cos(a)*4.8,1.0+(i%3)*1.1,-4.5+Math.sin(a)*2.4);s.scale.setScalar(.12+(i%2)*.05);fullWorld.add(s);}

 portalWorld.visible=false;ready=true;status.textContent='READY · QUEST: ENTER MR';document.querySelector('#start').disabled=false;document.querySelector('#climax').disabled=false;document.querySelector('#replay').disabled=false;
}
load().catch(e=>{console.error(e);status.textContent='LOAD ERROR · '+e.message;});

function setMaskedWorldVisible(v){portalWorld.visible=v;}
function reset(){running=false;forceTime=null;hero.visible=true;anchor.visible=true;anchor.position.set(0,1.42,-1.55);anchor.scale.setScalar(1);portal.scale.setScalar(.001);portal.visible=true;setMaskedWorldVisible(false);voidSphere.scale.setScalar(.001);fullWorld.visible=false;for(const s of breakouts){s.scale.setScalar(.001);s.visible=false;}status.textContent=ready?'READY · QUEST: ENTER MR':'LOADING';bar.style.width='0%';}
function start(at=0){if(!ready)return;running=true;t0=performance.now()/1000-at;forceTime=null;status.textContent='PLAYING · VIEWER STAYS STILL';}
function localTime(){if(forceTime!==null)return forceTime;if(!running)return 0;return Math.min(DURATION,performance.now()/1000-t0);}

function updateStudy(t){
 const pct=clamp(t/DURATION);bar.style.width=(pct*100).toFixed(1)+'%';
 const breathe=1+Math.sin(t*.9)*.025;hero.scale.setScalar(.13*breathe);hero.rotation.y=.5+t*.16;
 const open=seg(t,5,10);anchor.scale.setScalar(1-open*.88);portal.scale.setScalar(Math.max(.001,open));setMaskedWorldVisible(open>.03);
 const grow=seg(t,10,21);portal.scale.setScalar(open*(1+grow*.72));
 const targets=[[-1.15,1.65,-1.55],[1.2,1.25,-1.3],[-.9,.65,-1.8],[.85,2.15,-1.65],[0,2.55,-2.0]];
 breakouts.forEach((s,i)=>{const q=seg(t,11+i*.5,19+i*.5);s.visible=q>.01;s.scale.setScalar(.001+q*(.085+i*.012));const [x,y,z]=targets[i];s.position.set(x*q,y*q+(1-q)*1.45,z*q+(1-q)*-1.9);s.rotation.set(.3*i,t*.08*(i%2?1:-1),.2*i);});
 const pressure=seg(t,20,31);if(portalWorld){portalWorld.scale.setScalar(1+pressure*.24);portalWorld.position.y=pressure*.42;}
 const enter=seg(t,29,35);voidSphere.scale.setScalar(Math.max(.001,enter));if(enter>.72){fullWorld.visible=true;portal.visible=false;setMaskedWorldVisible(false);}else if(enter<.65){fullWorld.visible=false;portal.visible=true;setMaskedWorldVisible(true);}
 if(fullWorld.visible){fullWorld.rotation.y=Math.sin(t*.09)*.015;fullWorld.position.y=Math.sin(t*.15)*.035;}
 const leave=seg(t,46,53);if(t>=46){voidSphere.scale.setScalar(Math.max(.001,1-leave));if(leave>.30){fullWorld.visible=false;portal.visible=true;setMaskedWorldVisible(true);}portal.scale.setScalar(Math.max(.001,1.72*(1-leave*.82)));breakouts.forEach((s,i)=>{const k=1-leave;s.scale.setScalar(Math.max(.001,k*(.085+i*.012)));});}
 if(t>=53){const close=seg(t,53,58);portal.scale.setScalar(Math.max(.001,.31*(1-close)));anchor.scale.setScalar(.12+close*.88);hero.visible=true;setMaskedWorldVisible(close<.95);}
 if(t>=DURATION){running=false;status.textContent='END · REPLAY OR STAY';}
}

function activate(){if(!ready)return;if(!running)start(5);else if(localTime()<29)start(29);}
for(let i=0;i<2;i++){renderer.xr.getController(i).addEventListener('select',activate);}
renderer.domElement.addEventListener('click',()=>{if(!renderer.xr.isPresenting&&ready&&!running)start();});
document.querySelector('#start').onclick=()=>{reset();start();};document.querySelector('#climax').onclick=()=>{reset();start(28);};document.querySelector('#replay').onclick=()=>{reset();start();};

let xrStartTimer=0;renderer.xr.addEventListener('sessionstart',()=>{controls.enabled=false;sessionAligned=false;reset();xrStartTimer=performance.now()/1000;status.textContent='MR · LOOK FOR THE BLACK STONE';});
renderer.xr.addEventListener('sessionend',()=>{controls.enabled=true;experience.position.set(0,0,0);experience.rotation.set(0,0,0);camera.position.set(0,1.6,3.6);controls.target.set(0,1.45,-1.8);controls.update();reset();});
function alignToViewer(){const xrCam=renderer.xr.getCamera();const p=xrCam.getWorldPosition(new THREE.Vector3()),f=xrCam.getWorldDirection(new THREE.Vector3());experience.position.set(p.x,0,p.z);experience.rotation.set(0,Math.atan2(-f.x,-f.z),0);sessionAligned=true;}

renderer.setAnimationLoop(()=>{
 if(renderer.xr.isPresenting&&!sessionAligned)alignToViewer();
 if(renderer.xr.isPresenting&&!running&&ready&&performance.now()/1000-xrStartTimer>3)start();
 if(!renderer.xr.isPresenting)controls.update();
 updateStudy(localTime());renderer.render(scene,camera);
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
reset();
