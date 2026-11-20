// Galactic Arcade moved to https://optimusgrok.github.io/nebula-arcade/ . This replaces the old /galactic-arcade/ service worker:
// it deletes the old galactic-arcade-v1..v259 caches (Nebula Arcade v260+ and other games are left alone), unregisters itself
// and sends any open page to the same path on the new link.
const NEW='https://optimusgrok.github.io/nebula-arcade';
function map(href){try{const u=new URL(href);let p=u.pathname.replace(/^\/galactic-arcade/,'')||'/';p=p.replace(/(index|404)\.html$/,'');return NEW+p+u.search+u.hash;}catch(e){return NEW+'/';}}
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>{e.waitUntil(caches.keys()
  .then(ks=>Promise.all(ks.filter(k=>{const m=/^galactic-arcade-v(\d+)$/.exec(k);return m&&+m[1]<260;}).map(k=>caches.delete(k))))
  .then(()=>self.registration.unregister())
  .then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true}))
  .then(cs=>cs.forEach(c=>{try{c.navigate(map(c.url));}catch(e){}})).catch(()=>{}));});
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(Response.redirect(map(e.request.url),302));});
