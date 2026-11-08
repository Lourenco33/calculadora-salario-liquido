// Service worker: deixa o app abrir sem internet.
// A página é buscada na rede primeiro (para receber atualizações) e cai no cache se estiver offline.
const CACHE = "salario-clt-v5";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: usa o cache e atualiza em segundo plano
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const salvo = await c.match(req);
        const rede = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => salvo);
        return salvo || rede;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Arquivos do app: rede primeiro, cache se estiver offline
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
