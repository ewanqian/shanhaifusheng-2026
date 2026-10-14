import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';

const DURATION=48;
const BLACK=new THREE.Color(0x070708), PALE=new THREE.Color(0xe9e9e7), WHITE=new THREE.Color(0xffffff);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.45));
renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
document.body.prepend(renderer.domElement);
const vr=VRButton.createButton(renderer,{optionalFeatures:['hand-tracking']});document.body.append(vr);

const scene=new THREE.Scene();scene.background=WHITE;scene.fog=new THREE.FogExp2(0xffffff,.034);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.05,180);camera.position.set(0,1.65,3.2);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.05,-6.3);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=2.7;controls.maxDistance=7.5;controls.maxPolarAngle=Math.PI*.64;controls.minPolarAngle=Math.PI*.24;
const world=new THREE.Group();scene.add(world);

scene.add(new THREE.HemisphereLight(0xffffff,0x777777,1.28));
const key=new THREE.DirectionalLight(0xffffff,2.35);key.position.set(-9,16,8);scene.add(key);
const rim=new THREE.DirectionalLight(0xffffff,.72);rim.position.set(12,9,-12);scene.add(rim);

const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShaderMaterial({
  vertexShader:`varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 wp;void main(){float d=length(wp.xz);float core=exp(-d*.09);float g=1.0-.09*core;gl_FragColor=vec4(vec3(g),1.);}`
}));floor.rotation.x=-Math.PI/2;floor.position.y=-.62;world.add(floor);

const fogSheets=[];
for(const [z,y,s] of [[-9,1.6,1],[-16,2.8,1.35],[-27,4.2,1.8]]){
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},alpha:{value:0}},
    vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 v;uniform float time;uniform float alpha;void main(){float n=.5+.5*sin(v.x*13.+time*.08+sin(v.y*9.)*1.8);float b=exp(-pow((v.y-.42)*3.3,2.));float a=alpha*(.18+.16*n)*b;gl_FragColor=vec4(1.,1.,1.,a);}`});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(44*s,14*s),mat);m.position.set(0,y,z);world.add(m);fogSheets.push(m);
}

const manager=new THREE.LoadingManager();
manager.onProgress=(url,loaded,total)=>{const p=Math.round(loaded/Math.max(total,1)*100);document.querySelector('#loadPct').textContent=p+'%';document.querySelector('#loadFill').style.width=p+'%';document.querySelector('#loadNote').textContent=url.split('/').pop();};
const loader=new GLTFLoader(manager);

function cloneMaterials(root){root.traverse(o=>{if(!o.isMesh)return;const arr=Array.isArray(o.material)?o.material:[o.material];o.material=Array.isArray(o.material)?arr.map(m=>m.clone()):arr[0].clone();for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.color?.copy(BLACK);m.roughness=.79;m.metalness=0;m.envMapIntensity=.12;m.side=THREE.DoubleSide;m.transparent=true;m.opacity=1;m.depthWrite=true;m.normalScale?.setScalar(.34);}});return root;}
function centered(source,targetWidth){const root=cloneMaterials(source.clone(true));const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());root.position.sub(center);const wrap=new THREE.Group();wrap.add(root);const s=targetWidth/Math.max(size.x,.001);wrap.scale.setScalar(s);wrap.userData.materials=[];root.traverse(o=>{if(o.isMesh)wrap.userData.materials.push(...(Array.isArray(o.material)?o.material:[o.material]));});world.add(wrap);return wrap;}
function setOpacity(root,v){for(const m of root.userData.materials||[]){m.opacity=v;m.transparent=v<.999;m.depthWrite=v>.55;}}
function setColorMix(root,v){for(const m of root.userData.materials||[]){m.color.copy(BLACK).lerp(PALE,v);}}
const smooth=t=>t*t*(3-2*t), clamp=t=>Math.max(0,Math.min(1,t));
const window01=(t,a,b)=>smooth(clamp((t-a)/(b-a)));

let fragmentsSource,mountainSource,hero,overhang,distant,leftRidge,rightRidge;const stones=[];
async function build(){
  const [frag,mtn,hi]=await Promise.all([
    loader.loadAsync('./assets/fragments-capped-web.glb'),loader.loadAsync('./assets/mountain-web.glb'),loader.loadAsync('./assets/hero-high.glb').catch(()=>null)
  ]);
  fragmentsSource=frag.scene;mountainSource=mtn.scene;
  const heroSource=hi?.scene||fragmentsSource;
  hero=centered(heroSource,1.35);hero.position.set(0,1.12,-3.4);setColorMix(hero,.08);

  const meshes=[];fragmentsSource.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(let i=0;i<Math.min(meshes.length,14);i++){
    const g=new THREE.Group();const m=cloneMaterials(meshes[i].clone());g.add(m);const box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());m.position.sub(center);const target=.42+(i%5)*.12;g.scale.setScalar(target/Math.max(size.x,size.y,size.z,.001));g.userData.materials=[];m.traverse?.(o=>{if(o.isMesh)g.userData.materials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
    const a=i/14*Math.PI*2+.25;g.userData.a=a;g.userData.radius=3.2+(i%3)*.38;g.userData.baseY=.55+(i%6)*.34;g.position.set(Math.cos(a)*.4,g.userData.baseY,-4.2+Math.sin(a)*.2);g.scale.multiplyScalar(.001);world.add(g);stones.push(g);
  }

  overhang=centered(mountainSource,31);overhang.position.set(0,10.4,-8.6);overhang.rotation.set(Math.PI,.08,.025);setOpacity(overhang,0);
  distant=centered(mountainSource,44);distant.position.set(0,-1.3,-31);distant.rotation.y=.08;setOpacity(distant,0);
  leftRidge=centered(mountainSource,25);leftRidge.position.set(-15,-.9,-21);leftRidge.rotation.y=.34;setOpacity(leftRidge,0);
  rightRidge=centered(mountainSource,24);rightRidge.position.set(16,-1.1,-23);rightRidge.rotation.y=-.42;setOpacity(rightRidge,0);
  for(const r of [distant,leftRidge,rightRidge])setColorMix(r,.1);

  document.querySelector('#loading').style.opacity='0';setTimeout(()=>document.querySelector('#loading').remove(),850);ready=true;renderState(0);
}

const audio=new Audio('./assets/score.mp3');audio.loop=true;audio.preload='auto';audio.volume=0;
let ready=false,playing=false,started=0,pausedAt=0;
const copy={
  void:['00 / VOID','白场 · 一石','先不解释“炁”。只留下一个物体、一个尺度和一段呼吸。'],
  threshold:['01 / THRESHOLD','一物开始回应','万物不靠爆炸出现；从 1 到多，只改变关系。'],
  overhang:['02 / OVERHANG','山下 · UNDER THE MOUNTAIN','高潮不是移动观众，而是让世界的尺度压到头顶。'],
  hold:['03 / HOLD','停留在山下','固定观看位置。让远山、雾和黑色体量自己形成空间深度。'],
  ret:['04 / RETURN','退回白场','世界回收，留下一个可被记住的尺度差。']
};
let currentKey='';
function ui(key){if(key===currentKey)return;currentKey=key;const c=copy[key];document.querySelector('#kicker').textContent=c[0];document.querySelector('#headline').textContent=c[1];document.querySelector('#desc').textContent=c[2];}

function renderState(t){
  const p=t/DURATION;document.querySelector('#bar').style.width=(p*100)+'%';
  const ring=window01(t,11,21), reveal=window01(t,17,29), hold=window01(t,28,35), fade=window01(t,40,48);
  if(t<6)ui('void');else if(t<17)ui('threshold');else if(t<30)ui('overhang');else if(t<40)ui('hold');else ui('ret');

  const heroFade=1-window01(t,10,20);hero.visible=heroFade>.002;setOpacity(hero,heroFade*(1-fade));hero.rotation.y=t*.065;hero.position.y=1.12+Math.sin(t*.7)*.025;
  setColorMix(hero,window01(t,5,12)*.22);

  stones.forEach((s,i)=>{
    const delay=6+i*.34;const b=window01(t,delay,delay+4.8);const r=ring;const a=s.userData.a+t*.025;
    const spread=new THREE.Vector3(Math.cos(a)*s.userData.radius,s.userData.baseY+Math.sin(t*.35+i)*.06,-6.2+Math.sin(a)*1.55);
    const born=new THREE.Vector3(Math.cos(a)*.55,1.1+(i%3)*.16,-4.25+Math.sin(a)*.3);
    s.position.lerpVectors(born,spread,r);
    const sc=(.001+(1-.001)*b)*(1-fade);s.scale.setScalar(sc*(.94+.08*Math.sin(i*1.7)));
    s.rotation.set(.1*Math.sin(i),a*.42,t*.02+i*.23);
    setColorMix(s,clamp((ring-.35))*0.26);
    setOpacity(s,clamp(b*(1-fade)));
  });

  const overA=clamp(reveal*(1-fade));setOpacity(overhang,overA);overhang.position.y=10.4-reveal*5.5;overhang.position.z=-8.6+reveal*1.6;overhang.rotation.z=.025+Math.sin(t*.12)*.008;
  const landA=clamp(window01(t,20,31)*(1-fade));setOpacity(distant,landA*.26);setOpacity(leftRidge,landA*.46);setOpacity(rightRidge,landA*.38);
  distant.position.y=-1.3+Math.sin(t*.08)*.08;
  for(let i=0;i<fogSheets.length;i++){fogSheets[i].material.uniforms.time.value=t;fogSheets[i].material.uniforms.alpha.value=(.1+.78*reveal)*(1-fade)*(.65+i*.12);}
  scene.fog.density=.03+.016*reveal-.012*fade;
  document.querySelector('#veil').style.opacity=(fade*.82).toFixed(3);
  const targetVolume=.05+.23*reveal+.04*hold-.22*fade;audio.volume+=(clamp(targetVolume)-audio.volume)*.035;
}

function start(){if(!ready)return;playing=true;started=performance.now()/1000-pausedAt;audio.play().catch(()=>{});document.querySelector('#play').textContent='暂停';}
function pause(){playing=false;pausedAt=Math.min(DURATION,(performance.now()/1000-started));audio.pause();document.querySelector('#play').textContent='继续';}
function restart(){pausedAt=0;started=performance.now()/1000;renderState(0);if(playing){audio.currentTime=0;audio.play().catch(()=>{});}document.querySelector('#play').textContent=playing?'暂停':'播放';}
document.querySelector('#play').onclick=()=>playing?pause():start();document.querySelector('#restart').onclick=restart;
renderer.xr.addEventListener('sessionstart',()=>{controls.enabled=false;pausedAt=0;start();});renderer.xr.addEventListener('sessionend',()=>{controls.enabled=true;pause();camera.position.set(0,1.65,3.2);controls.target.set(0,2.05,-6.3);controls.update();});

renderer.setAnimationLoop(()=>{
  if(playing){let t=performance.now()/1000-started;if(t>DURATION){t%=DURATION;started=performance.now()/1000-t;audio.currentTime=0;}pausedAt=t;renderState(t);}controls.update();renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

build().catch(err=>{console.error(err);document.querySelector('#loadNote').textContent='load failed · '+err.message;});
