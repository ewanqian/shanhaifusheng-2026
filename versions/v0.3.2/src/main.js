import {phaseAt, LENGTH, XR_HERO, pinchEdge} from './sequence.js';
import {Soundscape, musicForChapter} from './soundscape.js';
import {installOfflineControl} from './offline.js';
import {gsap} from 'gsap';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {stoneOpacity, mountainDepth} from './visual-state.js';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;document.body.prepend(renderer.domElement);
let immersiveMode='immersive-vr';
const xrSupport={vr:false,mr:false};
const portalJourney=new URLSearchParams(location.search).get('portal')==='1';
const enterXR=document.createElement('button');enterXR.id='VRButton';document.querySelector('nav').append(enterXR);
const enterMR=document.createElement('button');enterMR.id='MRButton';document.querySelector('nav').append(enterMR);
for(const b of [enterXR,enterMR]){b.textContent='检测头显…';b.disabled=true;}
async function detectXR(){
 if(navigator.xr)try{[xrSupport.vr,xrSupport.mr]=await Promise.all(['immersive-vr','immersive-ar'].map(mode=>navigator.xr.isSessionSupported(mode)));}catch(e){console.warn('XR detection:',e.message);}
 updateXRButtons();
}
function updateXRButtons(){
 const active=renderer.xr.isPresenting;
 enterXR.textContent=active&&immersiveMode==='immersive-vr'?'退出 VR':xrSupport.vr?'进入 VR':'VR 需头显';
 enterMR.textContent=active&&immersiveMode==='immersive-ar'?'退出 MR':xrSupport.mr?'进入 MR 透视':'MR 透视不可用';
 enterXR.disabled=!ready||!xrSupport.vr||(active&&immersiveMode!=='immersive-vr');
 enterMR.disabled=!ready||!xrSupport.mr||(active&&immersiveMode!=='immersive-ar');
}
async function startXR(mode){
 score.unlock();
 try{
  if(renderer.xr.isPresenting){await renderer.xr.getSession().end();return;}
  immersiveMode=mode;
  const session=await navigator.xr.requestSession(mode,{requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking']});
  await renderer.xr.setSession(session);
 }catch(e){document.querySelector('#status').textContent='进入空间失败：'+e.message;updateXRButtons();}
}
enterXR.onclick=()=>startXR('immersive-vr');enterMR.onclick=()=>startXR('immersive-ar');
const scene=new THREE.Scene();scene.background=new THREE.Color('#fff');const whiteFog=new THREE.FogExp2('#fff',.06);scene.fog=whiteFog;
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.05,250);const dolly=new THREE.Group();scene.add(dolly);dolly.add(camera);const experience=new THREE.Group();scene.add(experience);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x505050,.85));const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-55,45,35);scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,.35);fill.position.set(38,38,-25);scene.add(fill);
// HDR studio cards produce broad mineral highlights without a chrome-white environment.
const studio=new THREE.Scene();studio.background=new THREE.Color(.025,.025,.025);const cardmat=new THREE.MeshBasicMaterial({color:new THREE.Color(5,5,5),side:THREE.DoubleSide});for(const [p,s] of [[[0,12,0],[24,4]], [[-10,6,5],[7,10]], [[12,8,-6],[4,12]]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(...s),cardmat);m.position.set(...p);m.lookAt(0,0,0);studio.add(m);}const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.08).texture;scene.environmentIntensity=.35;pmrem.dispose();
const loader=new GLTFLoader();const roots={};let active='mountain';let busy=false;
function dress(root){root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.roughness=.68;m.metalness=0;m.envMapIntensity=.2;m.normalScale?.setScalar(.45);m.side=THREE.FrontSide;m.transparent=true;m.depthWrite=true;m.forceSinglePass=true;m.userData.qiWhite={value:0};m.userData.qiFade={value:1};m.onBeforeCompile=s=>{s.uniforms.qiWhite=m.userData.qiWhite;s.uniforms.qiFade=m.userData.qiFade;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 shWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nshWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 shWorld;uniform float qiWhite;uniform float qiFade;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb*1.2,vec3(.9),qiWhite);').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.68,.82,clamp(roughnessFactor,0.0,1.0));').replace('#include <fog_fragment>','#include <fog_fragment>\n#ifdef USE_FOG\nfloat groundHaze=(1.0-exp(-length(shWorld-cameraPosition)*fogDensity*.3))*exp(-max(shWorld.y,0.0)*.08);gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,clamp(groundHaze,0.0,.5));\n#endif\ngl_FragColor.a*=qiFade;');};m.customProgramCacheKey=()=> 'qi-alpha-v5';}});}
let ready=false, hero, apron, transition, playing=false, finished=false, chapter=0;
let elapsed=0,total=0,startTime=0,alignPending=false,pendingXRStart=false,holding=false,holdStarted=0;
const stones=[],hands=[],controllers=[],pinches=[false,false];
const motion={field:0,birth:0,ring:0,land:0,hero:1,title:.7,lower:0};
const chapters=[
 ['00 / 在场','山海浮生 III｜炁 QI','进入空间。默认 90 秒自动播放，可随时停留。'],
 ['01 / 入场','山海浮生 III｜炁 QI',''],
 ['02 / 石场','一炁 · 生万物',''],
 ['03 / 转场','',''],
 ['04 / 悬山','山海浮生',''],
 ['05 / 回归','山海浮生 III｜炁 QI','']
];
const score=new Soundscape();
let cleanPreview=false;
const fullButton=document.createElement('button');fullButton.textContent='全屏 · 无 HUD';document.querySelector('nav').append(fullButton);
function setCleanPreview(value){cleanPreview=value;document.body.classList.toggle('clean-preview',value);if(value&&ready&&!playing)begin();}
fullButton.onclick=async()=>{setCleanPreview(true);try{await document.documentElement.requestFullscreen();}catch(e){console.warn('Fullscreen unavailable; clean window preview active');}};
addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)setCleanPreview(false);});
addEventListener('keydown',e=>{if(e.key==='Escape')setCleanPreview(false);if(e.key.toLowerCase()==='h'&&!renderer.xr.isPresenting)setCleanPreview(!cleanPreview);if(e.code==='Space'&&cleanPreview){e.preventDefault();toggleHold();}if(e.key.toLowerCase()==='r'&&cleanPreview)begin();});
const sound=document.createElement('button');sound.textContent='声音：开';document.querySelector('nav').append(sound);
installOfflineControl(document.querySelector('nav'));
sound.onclick=()=>{score.unlock();score.setMuted(!score.muted);sound.textContent=score.muted?'声音：关':'声音：开';};
const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShaderMaterial({
 vertexShader:'varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec3 p;void main(){float a=exp(-length(p.xz)*.035);gl_FragColor=vec4(vec3(1.-.065*a),1.);}'
}));floor.rotation.x=-Math.PI/2;floor.position.y=-.55;experience.add(floor);
function labelTexture(text,sub){
 const c=document.createElement('canvas');c.width=2048;c.height=512;const x=c.getContext('2d');
 x.fillStyle='#202020';x.textAlign='center';x.font='100px serif';x.fillText(text,1024,240);
 x.font='36px Arial';x.fillText(sub,1024,345);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function replaceLabel(mesh,text,sub){mesh.material.map?.dispose();mesh.material.map=labelTexture(text,sub);mesh.material.needsUpdate=true;}
const title=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.875),new THREE.MeshBasicMaterial({map:labelTexture('山海浮生 III · 炁','SHANHAI FUSHENG / SPATIAL PRELUDE'),transparent:true,depthWrite:false}));
title.position.set(0,2.6,-3.5);experience.add(title);
const cue=new THREE.Mesh(new THREE.PlaneGeometry(2,.5),new THREE.MeshBasicMaterial({map:labelTexture('正在载入…','PLEASE WAIT'),transparent:true,depthWrite:false}));
cue.position.set(0,1.05,-1.65);experience.add(cue);
const progressGroup=new THREE.Group();progressGroup.position.set(0,.49,-3);experience.add(progressGroup);
progressGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(1.4,.008),new THREE.MeshBasicMaterial({color:0xdddddd})));
const progressFill=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.012),new THREE.MeshBasicMaterial({color:0x555555}));progressFill.position.z=.002;progressGroup.add(progressFill);
const response=new THREE.Mesh(new THREE.RingGeometry(.36,.37,64),new THREE.MeshBasicMaterial({color:0x777777,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));experience.add(response);
let responseAge=10,lastFeedback=-10;
// Three actual depth layers: white drift crosses distant silhouettes, without a screen-space post pass.
const fogSheets=[];
for(const [z,y]of [[-4,1],[-8,2],[-13,3]]){
 const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
 uniforms:{time:{value:0},amount:{value:1}},
 vertexShader:'varying vec2 q;void main(){q=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec2 q;uniform float time;uniform float amount;void main(){float w=sin(q.x*17.+time*.12+sin(q.y*13.))*sin(q.y*9.-time*.07);float band=exp(-pow((q.y-.36)*5.,2.));float a=(.08+.10*w)*band*amount;gl_FragColor=vec4(1.,1.,1.,max(0.,a));}'});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(36,12),m);mesh.position.set(0,y,z);experience.add(mesh);fogSheets.push(mesh);
}
function resetView(){if(renderer.xr.isPresenting)return;camera.position.set(0,1.65,1.5);controls.target.set(0,1.5,-3);controls.update();}
controls.maxDistance=12;controls.minDistance=3;controls.maxPolarAngle=Math.PI*.51;resetView();
function caption(n){
 const[a,b,c]=chapters[n];document.querySelector('#chapter').textContent=a;document.querySelector('#name').textContent=b;document.querySelector('#line').textContent=c;
 gsap.fromTo(['#chapter','#name','#line'],{opacity:0,y:10},{opacity:1,y:0,duration:1,stagger:.12,overwrite:true});
 replaceLabel(cue,n===0?'点击开始体验':'握键停留 / 再次继续','');
}
function setChapter(n){
 if(playing)score.setState(musicForChapter(n));
 chapter=n;elapsed=0;caption(n);transition?.kill();transition=gsap.timeline({paused:true,defaults:{duration:4,ease:'sine.inOut'}});const tl=transition;
 if(n===0||n===1)tl.to(motion,{field:0,birth:0,ring:0,land:0,hero:1,title:n===0?.7:0,lower:0},0);
 if(n===2)tl.to(motion,{field:1,land:0,hero:1,title:0,ring:0},0).to(motion,{birth:3/12,duration:3},0).to(motion,{birth:7/12,duration:4},5).to(motion,{birth:1,duration:6},12);
 if(n===3)tl.to(motion,{field:0,ring:0,land:1,hero:0,title:0,duration:8},0);
 if(n===4)tl.to(motion,{field:0,hero:0,title:0,land:1,lower:0,duration:2},0);
 if(n===5)tl.to(motion,{land:0,field:0,ring:0,duration:6},0).to(motion,{hero:1,title:1,duration:7},3);
 document.querySelector('#begin').textContent=playing?'重新开始':'开始体验';
}
function begin(){
 if(!ready){pendingXRStart=true;return;}
 playing=true;finished=false;holding=false;reader.visible=false;title.visible=true;cue.visible=true;progressGroup.visible=true;document.querySelector('#about').style.display='none';
 startTime=performance.now()/1000;total=0;score.start();setChapter(1);holdButton.textContent='停留';replaceLabel(pauseControl,'停留','握键或指向此处捏合');
 document.querySelector('#status').textContent='90 秒 · 可停留 · 无需连续点击';feedback();
}
function feedback(){
 const now=performance.now()/1000;if(now-lastFeedback<.65)return;lastFeedback=now;responseAge=0;
 if(!playing&&!finished){begin();return;}
 // The ripple is feedback; avoid repetitive status text in the immersive scene.
 for(const source of renderer.xr.getSession()?.inputSources||[])source.gamepad?.hapticActuators?.[0]?.pulse?.(.18,80);
}
function select(controller){
 const now=performance.now()/1000;if(now-lastFeedback<.65)return;
 if(controller&&endControls.visible){const p=controller.getWorldPosition(new THREE.Vector3());const q=controller.getWorldQuaternion(new THREE.Quaternion());const r=new THREE.Raycaster(p,new THREE.Vector3(0,0,-1).applyQuaternion(q));const hit=r.intersectObjects(endControls.children)[0];if(hit){lastFeedback=now;endAction(hit.object.userData.action);return;}}
 if(controller&&pauseControl.visible){const p=controller.getWorldPosition(new THREE.Vector3());const q=controller.getWorldQuaternion(new THREE.Quaternion());const r=new THREE.Raycaster(p,new THREE.Vector3(0,0,-1).applyQuaternion(q));if(r.intersectObject(pauseControl).length){lastFeedback=now;toggleHold();return;}}
 if(reader.visible){const now=performance.now()/1000;if(now-lastFeedback<.8)return;lastFeedback=now;readPage++;if(readPage>=reading.length){readPage=0;}paintReader();return;}
 if(finished){begin();return;}
 feedback();
}
function finish(){
 playing=false;finished=true;total=LENGTH;score.fadeOut();
 replaceLabel(cue,'体验结束','捏合重播 · 或指向下方选项');document.querySelector('#status').textContent='体验结束 · 可重播、阅读或退出空间';
 document.querySelector('#line').textContent='体验结束。可重新播放，或阅读作品与系列档案。';
}
function previewNext(){
 if(!playing){begin();return;}
 const boundaries=[0,10,40,48,78];const next=Math.min(chapter+1,5);startTime=performance.now()/1000-boundaries[next-1];setChapter(next);
}
function showAbout(){if(renderer.xr.isPresenting)openReader();else location.href='./project.html';}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{
 if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;
 pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);
 if(hero&&ray.intersectObjects([hero,...stones.filter(s=>s.obj.visible).map(s=>s.obj)],true).length)select();
});
document.querySelector('#begin').onclick=()=>{resetView();begin();};
document.querySelector('#next').onclick=previewNext;
document.querySelector('#project').onclick=showAbout;
document.querySelector('#close').onclick=()=>document.querySelector('#about').style.display='none';
document.querySelector('#world').onclick=()=>{if(!playing)begin();startTime=performance.now()/1000-48;setChapter(4);};
document.querySelector('#fog').value=.06;document.querySelector('#fog').oninput=e=>whiteFog.density=+e.target.value;
document.querySelector('#rough').value=.58;document.querySelector('#rough').oninput=e=>{
 for(const root of [hero,...Object.values(roots)].filter(Boolean))root.traverse(o=>{if(o.isMesh)for(const m of materials(o))m.roughness=+e.target.value;});
};
for(let i=0;i<2;i++){
 const controller=renderer.xr.getController(i);dolly.add(controller);controller.addEventListener('selectend',()=>select(controller));controller.addEventListener('squeezestart',toggleHold);controllers.push(controller);
 const hand=renderer.xr.getHand(i);dolly.add(hand);hands.push(hand);
}
renderer.xr.addEventListener('sessionstart',()=>{
 document.body.classList.add('xr-active');updateXRButtons();if(immersiveMode==='immersive-ar'){scene.background=null;scene.fog=portalJourney?whiteFog:null;renderer.setClearColor(0xffffff,0);}controls.enabled=false;camera.position.set(0,0,0);camera.quaternion.identity();alignPending=true;pinches.fill(false);pendingXRStart=true;if(ready){begin();pendingXRStart=false;}
});
renderer.xr.addEventListener('sessionend',()=>{
 playing=false;holding=false;finished=false;total=0;elapsed=0;score.stop();holdButton.textContent='停留';endControls.visible=false;setChapter(0);document.querySelector('#status').textContent='STONE FIELD / HANGING MOUNTAIN · 0.3.2';
 document.body.classList.remove('xr-active');scene.fog=whiteFog;updateXRButtons();scene.background=new THREE.Color('#fff');renderer.setClearColor(0xffffff,1);portal.visible=false;voidShell.visible=false;enterXR.textContent=immersiveMode==='immersive-ar'?'进入 MR 空间':'进入 VR 空间';controls.enabled=true;experience.position.set(0,0,0);experience.quaternion.identity();reader.visible=false;title.visible=true;cue.visible=true;resetView();
});
function alignExperience(){
 const xrCam=renderer.xr.getCamera();const p=xrCam.getWorldPosition(new THREE.Vector3());const f=xrCam.getWorldDirection(new THREE.Vector3());
 experience.position.set(p.x,p.y-1.65,p.z);experience.rotation.set(0,Math.atan2(-f.x,-f.z),0);alignPending=false;
}
function materials(o){return Array.isArray(o.material)?o.material:[o.material];}
async function load(){
 document.querySelector('#begin').disabled=true;document.querySelector('#next').disabled=true;
 document.querySelector('#world').disabled=true;
 let completed=0;const progress=document.querySelector('#load-progress');
 function report(label,fraction=0){const percent=Math.min(98,Math.round((completed+fraction)/6*100));progress.hidden=false;progress.value=percent;document.querySelector('#status').textContent=`载入 ${percent}% · ${label}`;replaceLabel(cue,`载入 ${percent}%`,label);progressFill.scale.x=Math.max(.001,percent/100);progressFill.position.x=-(1-percent/100)*.7;}
 async function model(url,label){report(label);const gltf=await loader.loadAsync(url,event=>report(label,event.total?Math.min(.98,event.loaded/event.total):0));completed++;return gltf;}
 try{
  for(const name of ['fragments','mountain']){
   const g=await model(name==='fragments'?'./assets/fragments-capped-web.glb':'./assets/mountain-web.glb',name==='fragments'?'石场':'悬山');roots[name]=g.scene;g.scene.visible=false;
   if(name==='fragments')g.scene.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});dress(g.scene);experience.add(g.scene);
  }
  roots.fragments.traverse(o=>{
   if(!o.isMesh)return;o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(new THREE.Vector3());const max=Math.max(size.x,size.y,size.z);const i=stones.length,a=i*2.39996;
   const depth=[3.8,5,6.5,8,10,12,15,19,23,28,34,42][i%12];const spread=new THREE.Vector3(Math.cos(a)*(1.8+depth*.18),.6+(i%5)*.65,-depth);
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(i*1.7)*.35,i*2.39996,Math.cos(i*2.1)*.3));
   if(i<12)stones.push({obj:o,spread,max,q});else o.userData.excluded=true;o.visible=false;
  });
  if(!stones.length)throw new Error('Rock composition contains no meshes');
  const src=stones[0].obj;hero=src.clone();hero.material=src.material.clone();hero.material.userData={};
  try{const hd=await model('./assets/hero-high.glb?rev=2','高精度主石');let mesh;hd.scene.traverse(o=>{if(o.isMesh&&!mesh)mesh=o;});if(mesh){hero.geometry=mesh.geometry;hero.material=mesh.material;}}
  catch(e){completed=3;console.warn('HD hero unavailable; using composition fallback.');}
  hero.geometry=hero.geometry.clone();hero.geometry.center();hero.geometry.computeBoundingBox();
  const size=hero.geometry.boundingBox.getSize(new THREE.Vector3());hero.userData.sourceMax=Math.max(size.x,size.y,size.z);dress(hero);
  for(const m of materials(hero)){m.normalScale.setScalar(1);m.roughness=.76;m.envMapIntensity=.2;}
  experience.add(hero);
  roots.mountain.position.set(0,11,-10);roots.mountain.rotation.x=Math.PI;roots.mountain.scale.set(.7,.30,1.7);roots.mountain.traverse(o=>{if(o.isMesh)for(const m of materials(o)){m.normalScale.setScalar(.25);m.side=THREE.DoubleSide;m.needsUpdate=true;}});
  for(let i=0;i<2;i++){const layer=roots.mountain.clone();layer.position.x+=(i?1:-1)*58;layer.position.z-=60;layer.position.y=12;layer.scale.set(.7,.30,1.7);experience.add(layer);roots['ridge'+i]=layer;}
  const sourceMat=roots.mountain.children.find(o=>o.isMesh)?.material;
  const mat=sourceMat?sourceMat.clone():new THREE.MeshStandardMaterial({color:0x151515,roughness:.7});dress({traverse:fn=>fn({isMesh:true,material:mat})});
  apron=new THREE.Mesh(new THREE.PlaneGeometry(300,300),mat);apron.rotation.x=-Math.PI/2;apron.position.set(0,-.52,30);experience.add(apron);
  try{await score.load(done=>{completed=3+done;report('分幕音乐');});}catch(e){score.error=e.message;console.warn('Music unavailable:',e.message);}
  roots.fragments.visible=true;ready=true;document.querySelector('#begin').disabled=false;document.querySelector('#next').disabled=false;document.querySelector('#world').disabled=false;
  updateXRButtons();
  progress.value=100;progress.hidden=true;
  document.querySelector('#status').textContent=score.error?'0.3.2 · 音乐载入失败，可静音体验':'STONE FIELD / HANGING MOUNTAIN · 0.3.2';setChapter(0);
  if(pendingXRStart){begin();pendingXRStart=false;}
 }catch(e){document.querySelector('#status').textContent='载入失败：'+e.message;console.error(e);replaceLabel(cue,'载入失败','请刷新网页重试');}
}
const reader=new THREE.Mesh(new THREE.PlaneGeometry(2.45,1.8),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));reader.position.set(0,1.6,-2.8);reader.visible=false;experience.add(reader);
let readPage=0;
const reading=[
 ['山海浮生 III｜炁 QI','程雨阳独立编创的沉浸式实验环境肢体戏剧。身体、空间、影像、声音，是同一“炁”的分形显现。技术作为感知的延伸，连接生命经验与精神场域。','poster-qi.png'],
 ['一炁生万物','分形而不减其本，合形而不增其源。这个空间序章从一石开始，以聚散关系回应“炁”的流动宇宙观。','rehearsal-02.png'],
 ['系列档案 · 芭莎艺术','2025年11月刊：《山海浮生｜八荒祭》——身体、空间与生命议题的结构化表达。此为系列前作报道。程雨阳：“我希望空间本身成为叙事。”','press-portrait.png'],
 ['演出信息','导演：程雨阳。出品：旁观实验剧场 SET。10月15日 17:00—17:30，交通银行前滩31演艺中心·大剧场。退出 VR 后，可在作品专题中阅读杂志原页。','poster-stage.png']
];
const pageImages=reading.map(p=>{const image=new Image();image.src='./assets/editorial/'+p[2];image.onload=()=>{if(reader.visible)paintReader();};return image;});
function openReader(){playing=false;reader.visible=true;readPage=0;score.fadeOut(3);paintReader();}
function paintReader(){
 const c=document.createElement('canvas');c.width=2048;c.height=1504;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#111';
 x.font='bold 24px sans-serif';x.fillText('SHANHAI FUSHENG / EDITORIAL',130,140);
 x.font='bold 32px sans-serif';x.fillText(reading[readPage][0],130,310);
 x.font='500 22px sans-serif';let line='',y=440;for(const ch of reading[readPage][1]){if(x.measureText(line+ch).width>760){x.fillText(line,130,y);line=ch;y+=43;}else line+=ch;}x.fillText(line,130,y);
 const image=pageImages[readPage];if(image.complete&&image.naturalWidth){const scale=Math.min(860/image.naturalWidth,1060/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;x.drawImage(image,1050+(860-w)/2,250+(1060-h)/2,w,h);}
 x.fillStyle='#111';x.font='24px sans-serif';x.fillText(`${readPage+1} / 4 · 捏合翻页 · 下方可重播或退出`,130,1370);
 reader.material.map?.dispose();reader.material.map=new THREE.CanvasTexture(c);reader.material.map.colorSpace=THREE.SRGBColorSpace;reader.material.needsUpdate=true;
}

const portal=new THREE.Mesh(new THREE.CircleGeometry(.62,96),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));portal.position.set(0,1.6,-2.9);portal.visible=false;experience.add(portal);
const voidShell=new THREE.Mesh(new THREE.SphereGeometry(120,24,16),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide,transparent:true,opacity:0,depthWrite:false}));voidShell.visible=false;voidShell.renderOrder=-10;experience.add(voidShell);
const pauseControl=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.26),new THREE.MeshBasicMaterial({map:labelTexture('停留 / 继续','握键或指向此处捏合'),transparent:true,depthWrite:false}));pauseControl.position.set(0,.72,-1.65);experience.add(pauseControl);
const holdButton=document.createElement('button');holdButton.textContent='停留';document.querySelector('nav').append(holdButton);holdButton.onclick=toggleHold;
const endControls=new THREE.Group();endControls.position.set(0,.55,-1.8);experience.add(endControls);endControls.visible=false;
for(const [i,action,text] of [[0,'replay','重新体验'],[1,'read','作品档案'],[2,'exit','退出空间']]){const b=new THREE.Mesh(new THREE.PlaneGeometry(.76,.25),new THREE.MeshBasicMaterial({map:labelTexture(text,''),transparent:true,depthWrite:false}));b.position.x=(i-1)*.85;b.userData.action=action;endControls.add(b);}
function endAction(action){if(action==='replay')begin();if(action==='read')openReader();if(action==='exit')renderer.xr.getSession()?.end();}
function toggleHold(){if(!playing)return;const now=performance.now()/1000;if(holding){startTime+=now-holdStarted;holding=false;}else{holdStarted=now;holding=true;}holdButton.textContent=holding?'继续':'停留';replaceLabel(pauseControl,holding?'继续':'停留','握键或指向此处捏合');}

let lastCueSecond=-1;
function pollHandPinches(){
 // Raw joint pinch fallback has release hysteresis. Controller/select events and fallback share one feedback debounce.
 if(renderer.xr.isPresenting)hands.forEach((h,i)=>{
  const tip=h.joints?.['index-finger-tip'],thumb=h.joints?.['thumb-tip'];if(!tip?.visible||!thumb?.visible){pinches[i]=false;return;}
  const p=tip.getWorldPosition(new THREE.Vector3()),q=thumb.getWorldPosition(new THREE.Vector3());const edge=pinchEdge(pinches[i],p.distanceTo(q));pinches[i]=edge.held;if(edge.released)select();
 });
}
function animate(dt,t){
 score.tick();fullButton.disabled=!ready;endControls.visible=renderer.xr.isPresenting&&(finished||reader.visible);holdButton.disabled=!playing;
 if(alignPending&&renderer.xr.isPresenting)alignExperience();
 if(!ready||!hero)return;
 pollHandPinches();
 if(reader.visible){pauseControl.visible=false;hero.visible=false;title.visible=false;cue.visible=false;progressGroup.visible=false;response.material.opacity=0;for(const root of Object.values(roots))root.visible=false;if(apron)apron.visible=false;for(const sheet of fogSheets)sheet.visible=false;return;}
 if(playing){
  total=Math.max(0,(holding?holdStarted:performance.now()/1000)-startTime);const phase=phaseAt(total);if(phase.chapter!==chapter)setChapter(phase.chapter);elapsed=phase.elapsed;transition?.time(elapsed,false);
  if(phase.done)finish();
 }else if(!finished){transition?.time(Math.min(4,t),false);}
 const second=Math.floor(total);
 document.querySelector('#bar').style.width=`${Math.min(total/LENGTH,1)*100}%`;document.querySelector('#time').textContent=playing?`${second} / ${LENGTH} s`:'';
 progressFill.scale.x=Math.max(.001,total/LENGTH);progressFill.position.x=-(1-total/LENGTH)*.7;
 title.visible=false;cue.visible=!cleanPreview;cue.material.opacity=(!playing||finished||holding||total<5)?1:0;progressGroup.visible=false;
 pauseControl.visible=playing&&!cleanPreview;
 const isMR=renderer.xr.isPresenting&&immersiveMode==='immersive-ar';portal.visible=isMR&&portalJourney;voidShell.visible=isMR&&portalJourney;
 if(isMR&&portalJourney){const open=THREE.MathUtils.smoothstep(total,1,10)*(1-THREE.MathUtils.smoothstep(total,82,90));portal.scale.setScalar(.35+open*75);voidShell.material.opacity=THREE.MathUtils.smoothstep(open,.75,1);floor.visible=open>.98;}
 const size=renderer.xr.isPresenting?XR_HERO.width:.95;
 hero.visible=motion.hero>.005;hero.position.set(0,XR_HERO.height+Math.sin(t*.75)*.035,-XR_HERO.distance);
 hero.rotation.set(.14+Math.sin(t*.11)*.06,t*.025,.06);hero.scale.setScalar(size/hero.userData.sourceMax);
 for(const m of materials(hero)){m.userData.qiFade.value=motion.hero;m.userData.qiWhite.value=0;}
 responseAge+=dt;response.position.copy(hero.position);response.position.z+=.1;response.scale.setScalar(1+Math.min(responseAge,2)*.7);response.material.opacity=!cleanPreview&&responseAge<2?(1-responseAge/2)*.6:0;
 floor.visible=!isMR||(portalJourney&&total>=10&&total<=82);apron.visible=false;
 for(const n of ['mountain','ridge0','ridge1']){const root=roots[n];root.position.z=mountainDepth(t,n==='mountain'?0:n==='ridge0'?1:2);root.visible=motion.land>.001;root.traverse(o=>{if(o.isMesh)for(const m of materials(o))m.userData.qiFade.value=motion.land;});}
 roots.fragments.visible=true;
 stones.forEach((s,i)=>{
  const a=i/stones.length*Math.PI*1.8+t*.025;const ring=new THREE.Vector3(Math.cos(a)*3.2,2+Math.sin(a)*1.3,-4+Math.sin(a*2)*.25);const target=s.spread.clone();
  const birth=stoneOpacity(motion.birth,motion.field,i);s.obj.visible=birth>.002;s.obj.position.copy(target);s.obj.position.x+=Math.sin(t*.12+i*1.9)*.22;s.obj.position.y+=Math.sin(t*.24+i)*.12;
  s.obj.scale.setScalar((.55+(i%4)*.28)/s.max);s.obj.quaternion.copy(s.q);s.obj.rotateY(t*(.025+i%4*.009));s.obj.rotateX(Math.sin(t*.17+i)*.12);
  for(const m of materials(s.obj)){m.userData.qiFade.value=birth;m.userData.qiWhite.value=0;}
 });
 for(const sheet of fogSheets){sheet.visible=!isMR||(portalJourney&&total>=10&&total<=82);sheet.material.uniforms.time.value=t;sheet.material.uniforms.amount.value=whiteFog.density/.06;}

}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let previous=performance.now()/1000;
renderer.setAnimationLoop(()=>{const now=performance.now()/1000,dt=Math.min(now-previous,.1);previous=now;if(!renderer.xr.isPresenting)controls.update();animate(dt,now);renderer.render(scene,camera);});
await detectXR();await load();window.shanhai={scene,renderer,roots,experience,hero,revision:'0.3.2',status:()=>({ready,playing,holding,finished,chapter,total,reader:reader.visible,readPage,cleanPreview,mode:immersiveMode,blendMode:renderer.xr.getSession()?.environmentBlendMode,passthrough:renderer.xr.isPresenting&&immersiveMode==='immersive-ar'&&!portalJourney,heroFade:motion.hero,fieldFade:motion.field,mountainZ:roots.mountain?.position.z,audio:score.status(),endControls:endControls.visible,images:pageImages.map(i=>i.complete&&i.naturalWidth>0),heroDistance:hero?.getWorldPosition(new THREE.Vector3()).distanceTo(renderer.xr.isPresenting?renderer.xr.getCamera().getWorldPosition(new THREE.Vector3()):camera.position),heroSize:hero?new THREE.Box3().setFromObject(hero).getSize(new THREE.Vector3()).toArray():null,visibleStones:stones.filter(s=>s.obj.visible).length})};
