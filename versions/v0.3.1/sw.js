// Scope and cache are isolated to this immutable release. Never touches fallback.
const CACHE='shanhai-v0.3.1-complete';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='PREPARE_CACHE')return;
  event.waitUntil((async()=>{
    const reply=message=>event.source?.postMessage(message);
    try{
      const manifest=await fetch(new URL('./offline-assets.json',self.registration.scope),{cache:'no-store'});
      if(!manifest.ok)throw new Error('Offline manifest unavailable');
      const assets=await manifest.json();const cache=await caches.open(CACHE);let done=0;
      for(const path of assets){
        const url=new URL(path,self.registration.scope);let response=await cache.match(url);
        if(!response){response=await fetch(url);if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);await cache.put(url,response);}
        reply({type:'CACHE_PROGRESS',done:++done,total:assets.length});
      }
      reply({type:'CACHE_READY',done,total:assets.length});
    }catch(error){reply({type:'CACHE_ERROR',error:error.message});}
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);const url=new URL(event.request.url);url.search='';
    if(url.pathname.endsWith('/'))url.pathname+='index.html';
    const cached=await cache.match(url);return cached||fetch(event.request);
  })());
});
