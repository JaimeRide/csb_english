// Generado por actualizar_web.py: no editar a mano
const CACHE = "ingles-df1d65d3cd";
const ARCHIVOS = [
 "./",
 "index.html",
 "styles.css",
 "app.js",
 "manifest.webmanifest",
 "img/app-192.png",
 "img/app-512.png",
 "img/classroom/classroom_backpack.png",
 "img/classroom/classroom_chair.png",
 "img/classroom/classroom_computer.png",
 "img/classroom/classroom_desk.png",
 "img/classroom/classroom_glue_stick.png",
 "img/classroom/classroom_marker.png",
 "img/classroom/classroom_notebook.png",
 "img/classroom/classroom_paper.png",
 "img/classroom/classroom_pencil.png",
 "img/classroom/classroom_pencil_case.png",
 "img/classroom/classroom_scissors.png",
 "img/classroom/classroom_sharpener.png",
 "img/classroom/classroom_tape.png",
 "img/classroom/color_black.png",
 "img/classroom/color_blue.png",
 "img/classroom/color_brown.png",
 "img/classroom/color_green.png",
 "img/classroom/color_red.png",
 "img/classroom/color_white.png",
 "img/classroom/color_yellow.png",
 "img/icons/brush.png",
 "img/icons/hand_that.png",
 "img/icons/hand_this.png",
 "img/icons/hand_this_horizontal.png",
 "data.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
