// Service worker de l'application CMC Résultats.
// - Les pages viennent toujours d'internet en priorité : l'application est donc toujours à jour.
// - Sans connexion, une page « Pas de connexion internet » s'affiche au lieu d'une erreur.
// - Les données (Firebase) ne sont jamais mises en cache ici.
const VERSION = "cmc-v2";
const FICHIERS = ["./hors-ligne.html", "./icones/icone-192.png", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // « no-cache » : toujours redemander au serveur (jamais une vieille copie du navigateur)
    e.respondWith(fetch(req, { cache: "no-cache" }).catch(() => caches.match("./hors-ligne.html")));
    return;
  }
  // Autres fichiers (manifeste, icônes…) : internet d'abord, pour qu'un changement de nom ou d'icône
  // arrive sur les téléphones ; la copie gardée ne sert que sans connexion.
  e.respondWith(fetch(req).then((r) => {
    if (r.ok && FICHIERS.some((f) => new URL(f, self.location).href === req.url)) {
      const copie = r.clone();
      caches.open(VERSION).then((c) => c.put(req, copie));
    }
    return r;
  }).catch(() => caches.match(req)));
});
