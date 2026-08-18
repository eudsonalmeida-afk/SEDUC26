const CACHE="seduc2026-pwa-v13-banco-questoes";
const CORE=[
  "./","./index.html","./manifest.webmanifest","./cloud-config.js","./cloud-sync.js","./pwa.js",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(req.mode==="navigate"){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy));return res;}).catch(()=>caches.match("./index.html")));
    return;
  }
  if(url.origin===self.location.origin){
    if(url.pathname.endsWith("cloud-config.js")){
      event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req)));
    } else {
      event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;})));
    }
    return;
  }
  if(url.hostname==="cdn.jsdelivr.net"){
    event.respondWith(caches.match(req).then(cached=>{
      const network=fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;}).catch(()=>cached);
      return cached||network;
    }));
  }
});
