"use strict";
/* Inglés para peques: Vocabulary, Listening y Grammar > Demonstratives.
 *
 * Las tarjetas vienen de data.js (generado por actualizar_web.py). El prefijo del
 * archivo es su tipo (color_, classroom_...) y lo que va detrás, la palabra.
 * Teclado (para PC): Espacio/Intro/flechas/1-2-3/L, como en la versión de escritorio.
 */

const EJERCICIOS_DESCANSO = 20;  // ejercicios hasta que el robot se sobrecarga y pide descanso
const TODOS = "all";
// Nombre y orden de los tipos conocidos; los demás van al final tal cual
const NOMBRES_TIPO = {color: "Colours", classroom: "Classroom", animal: "Animals",
                      number: "Numbers", action: "Actions", food: "Food"};
const SOLO_PLURAL = new Set(["scissors"]);  // nombres sin singular
// Demostrativos: [palabra, verbo, plural, cerca]
const DEMOSTRATIVOS = [["this", "is", false, true], ["these", "are", true, true],
                       ["that", "is", false, false], ["those", "are", true, false]];
// Niveles de Demonstratives: qué pasos de la frase hay que elegir (0 demostrativo, 1 verbo, 2 objeto);
// el resto ya viene puesto
const NIVELES_DEMOSTRATIVOS = {1: [1], 2: [0], 3: [0, 1, 2]};

const TARJETAS = window.DATOS.tarjetas;

/* ---------- Utilidades ---------- */

function crear(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const h of hijos) el.append(h);
  return el;
}

function barajar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

const azar = lista => lista[Math.floor(Math.random() * lista.length)];
const capitalizar = t => t.charAt(0).toUpperCase() + t.slice(1);
const nombreTipo = tipo => NOMBRES_TIPO[tipo] || capitalizar(tipo);

function plural(nombre) {
  if (SOLO_PLURAL.has(nombre)) return nombre;
  if (/(s|sh|ch|x|z)$/.test(nombre)) return nombre + "es";
  if (/[^aeiou]y$/.test(nombre)) return nombre.slice(0, -1) + "ies";
  return nombre + "s";
}

/** Tamaño más grande con esa proporción (ancho/alto) que cabe en el elemento. */
function encajar(caja, proporcion, margen = 0) {
  const w = Math.max(caja.clientWidth - margen, 10);
  const h = Math.max(caja.clientHeight - margen, 10);
  return w / h > proporcion ? [h * proporcion, h] : [w, w / proporcion];
}

/** Reduce la letra hasta que el texto quepa en su caja. */
function ajustarTexto(el, tamMaximo) {
  let tam = tamMaximo;
  el.style.fontSize = tam + "px";
  while (el.scrollWidth > el.clientWidth && tam > 10) {
    tam -= 1;
    el.style.fontSize = tam + "px";
  }
}

/* ---------- Imágenes ---------- */

const imagenes = new Map();
function cargar(src) {
  if (!imagenes.has(src)) {
    imagenes.set(src, new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = ko;
      img.src = src;
    }));
  }
  return imagenes.get(src);
}
const listas = new Map();  // src -> Image ya cargada (tras precargar todo)
async function precargar() {
  const srcs = TARJETAS.map(t => t.archivo).concat(
    ["img/icons/hand_this_horizontal.png", "img/icons/hand_that.png", "img/icons/brush.png"]);
  await Promise.all(srcs.map(async s => listas.set(s, await cargar(s))));
}

/** Dibujo de una tarjeta. Los colores llevan una brocha abajo a la izquierda como pista. */
function dibujoTarjeta(tarjeta) {
  const img = listas.get(tarjeta.archivo);
  if (tarjeta.tipo !== "color") {
    return crear("img", {src: tarjeta.archivo, alt: "", draggable: "false"});
  }
  // El color es liso: se agranda antes de poner la brocha para que salga nítida
  const escala = 600 / Math.min(img.width, img.height);
  const lienzo = crear("canvas");
  lienzo.width = Math.round(img.width * escala);
  lienzo.height = Math.round(img.height * escala);
  const ctx = lienzo.getContext("2d");
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  const brocha = listas.get("img/icons/brush.png");
  const lado = Math.min(lienzo.width, lienzo.height) * 0.225;
  const alto = brocha.height * lado / brocha.width;
  const margen = Math.min(lienzo.width, lienzo.height) * 0.04;
  ctx.drawImage(brocha, margen, lienzo.height - alto - margen, lado, alto);
  return lienzo;
}

/** Mano señalando + uno o dos dibujos: cerca y grandes (this/these) o lejos y pequeños (that/those). */
function componerDemostrativo(demo, tarjeta) {
  const [, , esPlural, cerca] = DEMOSTRATIVOS.find(d => d[0] === demo);
  const W = 800, H = 520;
  const lienzo = crear("canvas");
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);

  const mano = listas.get(cerca ? "img/icons/hand_this_horizontal.png" : "img/icons/hand_that.png");
  const escMano = cerca ? W * 0.26 / mano.width : H * 0.42 / mano.height;
  const mw = mano.width * escMano, mh = mano.height * escMano;

  const zx0 = cerca ? W * 0.04 + mw + W * 0.06 : W * 0.52;
  const zx1 = cerca ? W * 0.97 : W * 0.95;
  const maxAlto = cerca ? H * 0.55 : H * 0.28;
  const n = esPlural ? 2 : 1, hueco = W * 0.03;
  const obj = listas.get(tarjeta.archivo);
  let esc = Math.min(((zx1 - zx0) - hueco * (n - 1)) / n / obj.width, maxAlto / obj.height);
  if (!cerca) esc *= 0.75;  // lejos: un 25 % más pequeños
  const ow = obj.width * esc, oh = obj.height * esc;
  let x = (zx0 + zx1 - (n * ow + (n - 1) * hueco)) / 2;
  const y = cerca ? H - oh - H * 0.06 : H * 0.06;

  // Cerca: la mano a la altura de los objetos. Lejos: abajo a la izquierda
  const manoY = cerca ? y + (oh - mh) / 2 : H - mh - H * 0.06;
  ctx.drawImage(mano, W * 0.04, manoY, mw, mh);
  for (let i = 0; i < n; i++) {
    ctx.drawImage(obj, x, y, ow, oh);
    x += ow + hueco;
  }
  return lienzo;
}

/* ---------- Voz ---------- */
/* El robot habla con audios ya generados (audio/<voz>/*.ogg, voz de Piper con efecto robótico,
 * creados por actualizar_web.py). Si falta alguno, se usa la voz del dispositivo. */

// {alba: Set(claves), alan: Set(claves)}
const AUDIOS = Object.fromEntries(Object.entries(window.DATOS.audios || {}).map(([v, l]) => [v, new Set(l)]));
// Robots del selector del principio: voz y adorno de la cara
const ROBOTS = [{voz: "alba", adorno: "lazo"}, {voz: "alan", adorno: "bigote"}];
const voz = {elegida: null, turno: 0, pendiente: null, audio: null, robot: leerRobotGuardado()};

function leerRobotGuardado() {
  try { return localStorage.getItem("robot") || ROBOTS[0].voz; } catch { return ROBOTS[0].voz; }
}

/** 'These are the pencil cases' -> 'these_are_the_pencil_cases' (igual que en actualizar_web.py). */
const claveAudio = texto => (texto.toLowerCase().match(/[a-z]+/g) || []).join("_");

function elegirVoz() {
  const voces = speechSynthesis.getVoices();
  voz.elegida = voces.find(v => /^en[-_]GB/i.test(v.lang)) || voces.find(v => /^en/i.test(v.lang)) || null;
}
if ("speechSynthesis" in window) {
  elegirVoz();
  speechSynthesis.addEventListener("voiceschanged", elegirVoz);
}

/** Corta lo que se esté diciendo (avisando a quien lo pidió). */
function callar() {
  voz.turno++;
  if (voz.audio) {
    voz.audio.pause();
    voz.audio = null;
  }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const pendiente = voz.pendiente;
  voz.pendiente = null;
  if (pendiente) pendiente(true);
}

/** Dice el texto en inglés. alTerminar(cortado) se llama al acabar o si se corta. */
function hablar(texto, alTerminar) {
  callar();
  const turno = voz.turno;
  voz.pendiente = alTerminar;
  const terminar = () => {
    if (turno !== voz.turno) return;
    voz.pendiente = null;
    voz.audio = null;
    alTerminar(false);
  };
  const clave = claveAudio(texto);
  if (!AUDIOS[voz.robot] || !AUDIOS[voz.robot].has(clave)) return hablarDispositivo(texto, turno, terminar);

  const audio = new Audio(`audio/${voz.robot}/${clave}.ogg`);
  voz.audio = audio;
  const planB = () => { if (turno === voz.turno && voz.audio === audio) hablarDispositivo(texto, turno, terminar); };
  audio.onended = terminar;
  audio.onerror = planB;
  audio.play().catch(planB);
}

/** Voz del dispositivo, con la frase entera de una vez (por palabras queda muy cortado). */
function hablarDispositivo(texto, turno, terminar) {
  voz.audio = null;
  if (!("speechSynthesis" in window)) return setTimeout(terminar, 300);
  const frase = new SpeechSynthesisUtterance(texto.toLowerCase());
  frase.lang = voz.elegida ? voz.elegida.lang : "en-GB";
  if (voz.elegida) frase.voice = voz.elegida;
  frase.rate = 0.85;
  let hecho = false;
  const fin = () => {
    if (hecho) return;
    hecho = true;
    clearTimeout(reloj);
    if (turno === voz.turno) terminar();
  };
  const reloj = setTimeout(fin, 2000 + 120 * texto.length);  // por si el navegador no avisa
  frase.onend = fin;
  frase.onerror = fin;
  try {
    speechSynthesis.speak(frase);
  } catch (error) {
    fin();
  }
}

/* ---------- Robot ---------- */

/** Carita de robot en SVG. animo: null, "feliz", "triste" o "sobrecargado". carga: 0-1 de rojo.
 * adorno: null, "bigote" o "lazo" (solo en el selector de voz). */
function svgRobot({animo = null, boca = false, carga = 0, adorno = null} = {}) {
  const id = "c" + Math.random().toString(36).slice(2);
  let ojos = "";
  for (const x of [33, 67]) {
    if (animo === "feliz") {
      const puntos = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 14 : 6.3, a = Math.PI / 2 + i * Math.PI / 5;
        puntos.push(`${(x + r * Math.cos(a)).toFixed(1)},${(46 - r * Math.sin(a)).toFixed(1)}`);
      }
      ojos += `<polygon points="${puntos.join(" ")}" fill="#ffc800" stroke="#282828" stroke-width="2"/>`;
    } else if (animo === "sobrecargado") {
      ojos += `<path d="M${x - 8} 38 L${x + 8} 54 M${x - 8} 54 L${x + 8} 38" stroke="#282828" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      ojos += `<circle cx="${x}" cy="46" r="10" fill="white" stroke="#282828" stroke-width="3.5"/>
               <circle cx="${x}" cy="46" r="4" fill="#282828"/>`;
      if (animo === "triste") {
        const lx = x < 50 ? x - 10 : x + 10;
        ojos += `<path d="M${lx} 54 L${lx - 5} 64 A5 5 0 1 0 ${lx + 5} 64 Z" fill="#3c96f0"/>`;
      }
    }
  }
  const nivel = 95 - 75 * Math.min(carga, 1);
  const bocaSvg = boca
    ? `<rect x="30" y="66" width="40" height="20" rx="6" fill="#282828"/>`
    : `<line x1="30" y1="76" x2="70" y2="76" stroke="#282828" stroke-width="4" stroke-linecap="round"/>`;
  let adornoSvg = "";
  if (adorno === "bigote") {
    adornoSvg = `<path d="M50 63 C44 57 33 58 25 68 C33 66 42 69 50 67 C58 69 67 66 75 68 C67 58 56 57 50 63 Z"
                       fill="#5a3a1e" stroke="#282828" stroke-width="1.5"/>`;
  } else if (adorno === "lazo") {
    adornoSvg = `<g stroke="#282828" stroke-width="2" stroke-linejoin="round" fill="#f06aa0">
                   <path d="M74 21 L58 11 L60 33 Z"/><path d="M74 21 L90 11 L88 33 Z"/>
                   <circle cx="74" cy="21" r="5"/></g>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><clipPath id="${id}"><rect x="10" y="20" width="80" height="75" rx="14"/></clipPath></defs>
    <line x1="50" y1="6" x2="50" y2="20" stroke="#282828" stroke-width="4"/>
    <circle cx="50" cy="7" r="7" fill="#e64646" stroke="#282828" stroke-width="2"/>
    <rect x="2" y="45" width="8" height="25" fill="#282828"/>
    <rect x="90" y="45" width="8" height="25" fill="#282828"/>
    <rect x="10" y="20" width="80" height="75" rx="14" fill="#c8d2dc"/>
    <rect x="10" y="${nivel}" width="80" height="${95 - nivel}" fill="#eb3c32" clip-path="url(#${id})"/>
    <rect x="10" y="20" width="80" height="75" rx="14" fill="none" stroke="#282828" stroke-width="4"/>
    ${ojos}${bocaSvg}${adornoSvg}</svg>`;
}

const SVG_ALTAVOZ = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M10 38 H30 L55 16 V84 L30 62 H10 Z" fill="#111"/>
  <path d="M66 34 Q76 50 66 66 M76 24 Q92 50 76 76 M86 14 Q106 50 86 86" fill="none" stroke="#111"
        stroke-width="7" stroke-linecap="round"/></svg>`;

/** Contador de ejercicios compartido por todos los robots; se vacía al cambiar de sección. */
const carga = {hechos: 0, robots: new Set(), alSobrecargar: null};

function ejercicioHecho() {
  if (carga.hechos >= EJERCICIOS_DESCANSO) return;  // ya está lleno; esperando al descanso
  carga.hechos++;
  carga.robots.forEach(r => r.pintar());
  if (carga.hechos >= EJERCICIOS_DESCANSO && carga.alSobrecargar) carga.alSobrecargar();
}

function vaciarCarga() {
  carga.hechos = 0;
  carga.robots.forEach(r => r.pintar());
}

/** Botón 🤖🔊: lee lo que devuelve texto(); mientras habla se pone amarillo y mueve la boca. */
class Robot {
  constructor(texto, {grande = false, alTerminar = null} = {}) {
    this.texto = texto;
    this.alTerminar = alTerminar;
    this.animo = null;
    this.boca = false;
    this.hablando = false;
    this.turno = 0;
    this.el = crear("button", {class: "robot" + (grande ? " grande" : ""), "aria-label": "Escuchar",
                               onclick: () => this.pulsar()});
    carga.robots.add(this);
    this.pintar();
  }

  pintar() {
    // al acertar o fallar se queda con la boca abierta; si habla, la mueve
    const boca = this.hablando ? this.boca : this.animo === "feliz" || this.animo === "triste";
    this.el.innerHTML = svgRobot({animo: this.animo, boca,
                                  carga: carga.hechos / EJERCICIOS_DESCANSO}) + SVG_ALTAVOZ;
    this.el.classList.toggle("hablando", this.hablando);
  }

  set activo(valor) { this.el.disabled = !valor; }

  ponerAnimo(animo) {
    this.animo = animo;
    this.pintar();
  }

  pulsar() {
    if (this.el.disabled) return;
    const frase = this.texto();
    if (!frase) return;
    const turno = ++this.turno;
    clearInterval(this.reloj);
    this.hablando = true;
    this.reloj = setInterval(() => { this.boca = !this.boca; this.pintar(); }, 180);
    this.pintar();
    hablar(frase, cortado => {
      if (turno !== this.turno) return;  // se volvió a pulsar: sigue la nueva
      clearInterval(this.reloj);
      this.hablando = false;
      this.boca = false;
      this.pintar();
      if (this.alTerminar) this.alTerminar(cortado);
    });
  }
}

/* ---------- Iconos de ojo (modos) ---------- */

function svgOjo(tachado) {
  return `<svg viewBox="0 0 100 60" aria-hidden="true">
    <ellipse cx="50" cy="30" rx="44" ry="22" fill="none" stroke="#282828" stroke-width="6"/>
    <circle cx="50" cy="30" r="12" fill="#282828"/>
    ${tachado ? `<line x1="18" y1="56" x2="82" y2="4" stroke="white" stroke-width="14"/>
                 <line x1="18" y1="56" x2="82" y2="4" stroke="#282828" stroke-width="6" stroke-linecap="round"/>` : ""}
  </svg>`;
}

/* ---------- Vocabulary ---------- */

class VistaVocabulario {
  constructor() {
    this.modo = "entrenamiento";
    this.mazo = [];
    this.pos = 0;
    this.pista = 0;  // modo test: 0 = "?", 1 = iniciales "P***** C***", 2 = palabra entera

    this.botonesModo = {};
    const modos = crear("div", {class: "modos"});
    for (const [valor, tachado, etiqueta] of [["entrenamiento", false, "Entrenamiento"], ["test", true, "Test"]]) {
      const b = crear("button", {"aria-label": etiqueta, onclick: () => this.cambiarModo(valor)});
      b.innerHTML = svgOjo(tachado);
      this.botonesModo[valor] = b;
      modos.append(b);
    }

    this.dibujo = crear("div", {class: "dibujo"});
    this.palabra = crear("div", {class: "palabra"});
    this.tarjeta = crear("div", {class: "tarjeta", onclick: () => this.avanzar()}, this.dibujo, this.palabra);
    this.hueco = crear("div", {class: "hueco"}, this.tarjeta);
    new ResizeObserver(() => this.redimensionar()).observe(this.hueco);

    this.contador = crear("span", {class: "marcador"});
    this.robot = new Robot(() => this.palabraVisible() ? this.carta().nombre : null);
    const controles = crear("div", {class: "fila-botones"},
      crear("button", {class: "boton", onclick: () => this.mover(-1), "aria-label": "Anterior"}, "◀"),
      this.contador,
      crear("button", {class: "boton", onclick: () => this.mover(1), "aria-label": "Siguiente"}, "▶"),
      crear("button", {class: "boton", onclick: () => this.empezar(), "aria-label": "Barajar"}, "↻"),
      this.robot.el);

    this.el = crear("section", {class: "vista"}, modos, this.hueco, controles);
  }

  entrar(tarjetas) {
    this.tarjetas = tarjetas;
    this.empezar();
  }

  empezar() {
    this.mazo = barajar([...this.tarjetas]);
    this.pos = 0;
    this.pista = 0;
    this.mostrar();
  }

  carta() { return this.mazo[this.pos]; }
  palabraVisible() { return this.mazo.length > 0 && (this.modo !== "test" || this.pista === 2); }

  cambiarModo(modo) {
    this.modo = modo;
    this.pista = 0;
    this.mostrar();
  }

  /** En modo test, primero da pistas; si la palabra ya se ve, pasa a la siguiente. */
  avanzar() {
    if (this.modo === "test" && this.pista < 2) {
      this.pista++;
      this.mostrar();
    } else {
      this.mover(1);
    }
  }

  mover(paso) {
    if (!this.mazo.length) return;
    if (paso > 0 && this.modo === "test" && this.pista === 2) ejercicioHecho();
    this.pista = 0;
    this.pos += paso;
    if (this.pos >= this.mazo.length) {  // fin del mazo: se vuelve a barajar
      barajar(this.mazo);
      this.pos = 0;
    }
    this.pos = Math.max(this.pos, 0);
    this.mostrar();
  }

  mostrar() {
    for (const [valor, b] of Object.entries(this.botonesModo)) b.classList.toggle("activo", valor === this.modo);
    if (!this.mazo.length) return;
    const carta = this.carta();
    this.dibujo.replaceChildren(dibujoTarjeta(carta));
    const pista = this.modo === "test" ? this.pista : 2;
    let texto = carta.nombre.toUpperCase();
    if (pista === 0) texto = "?";
    else if (pista === 1) texto = texto.replace(/[A-Z]+/g, p => p[0] + "*".repeat(p.length - 1));
    this.palabra.textContent = texto;
    this.palabra.classList.toggle("oculta", pista < 2);
    this.contador.textContent = `${this.pos + 1} / ${this.mazo.length}`;
    this.robot.activo = this.palabraVisible();
    this.redimensionar();
  }

  redimensionar() {
    const [w, h] = encajar(this.hueco, 0.72, 12);
    this.tarjeta.style.width = w + "px";
    this.tarjeta.style.height = h + "px";
    ajustarTexto(this.palabra, h * 0.075);
  }

  tecla(e) {
    if (e.key === " ") this.avanzar();
    else if (e.key === "ArrowRight") this.mover(1);
    else if (e.key === "ArrowLeft") this.mover(-1);
    else if (e.key === "r" || e.key === "R") this.empezar();
    else return false;
    return true;
  }
}

/* ---------- Listening ---------- */

class VistaListening {
  constructor() {
    this.aciertos = this.hechas = 0;
    this.ronda = 0;
    this.marcador = crear("div", {class: "marcador"});
    this.robot = new Robot(() => { this.rondaLeida = this.ronda; return this.objetivo.nombre; },
                           {grande: true, alTerminar: cortado => this.finDeHablar(cortado)});
    this.opciones = crear("div", {class: "opciones"});
    this.hueco = crear("div", {class: "hueco"}, this.opciones);
    new ResizeObserver(() => this.redimensionar()).observe(this.hueco);
    this.solucion = crear("div", {class: "solucion"});
    this.siguienteBtn = crear("button", {class: "boton fuerte", onclick: () => this.siguiente()}, "Siguiente ▶");
    this.el = crear("section", {class: "vista"}, this.marcador, this.robot.el, this.hueco,
                    this.solucion, this.siguienteBtn);
  }

  entrar(tarjetas) {
    this.tarjetas = tarjetas;
    this.pendientes = [];
    this.aciertos = this.hechas = 0;
    this.siguiente();
  }

  siguiente() {
    if (!this.pendientes.length) this.pendientes = barajar([...this.tarjetas]);  // cada palabra, una vez
    this.objetivo = this.pendientes.pop();
    const otras = barajar(this.tarjetas.filter(t => t.nombre !== this.objetivo.nombre));
    this.eleccion = barajar(otras.slice(0, 2).concat([this.objetivo]));
    this.elegida = null;
    this.escuchada = false;  // no se puede elegir hasta que el robot termine de decir la palabra
    this.ronda++;
    this.robot.ponerAnimo(null);
    this.mostrar();
  }

  finDeHablar(cortado) {
    if (!cortado && !this.escuchada && this.rondaLeida === this.ronda) {
      this.escuchada = true;
      this.mostrar();
    }
  }

  elegir(tarjeta) {
    if (this.elegida || !this.escuchada) return;
    this.elegida = tarjeta;
    this.hechas++;
    const bien = tarjeta === this.objetivo;
    this.aciertos += bien;
    this.robot.ponerAnimo(bien ? "feliz" : "triste");
    this.mostrar();
    ejercicioHecho();
  }

  mostrar() {
    const respondida = Boolean(this.elegida);
    this.marcador.textContent = `Aciertos: ${this.aciertos} / ${this.hechas}`;
    this.solucion.textContent = respondida ? this.objetivo.nombre.toUpperCase() : "";
    this.siguienteBtn.disabled = !respondida;
    this.opciones.replaceChildren(...this.eleccion.map((t, i) => {
      const b = crear("button", {class: "opcion", onclick: () => this.elegir(t), "aria-label": String(i + 1)});
      if (!this.escuchada) {
        // Antes de escuchar no se enseñan los dibujos: así se concentra en oír
        b.classList.add("bloqueada");
        b.append(crear("span", {class: "interrogante"}, "?"));
      } else {
        b.append(dibujoTarjeta(t));
        if (respondida && t === this.objetivo) b.classList.add("correcta");
        else if (t === this.elegida) b.classList.add("fallada");
      }
      b.append(crear("span", {class: "numero"}, String(i + 1)));
      return b;
    }));
    this.redimensionar();
  }

  redimensionar() {
    const n = this.eleccion ? this.eleccion.length : 3;
    const columna = getComputedStyle(this.opciones).flexDirection === "column";
    const hueco = columna ? 10 : 16;
    const w = this.hueco.clientWidth - 12, h = this.hueco.clientHeight - 12;
    const lado = Math.max(40, columna ? Math.min(w, (h - hueco * (n - 1)) / n)
                                      : Math.min(h, (w - hueco * (n - 1)) / n));
    for (const b of this.opciones.children) {
      b.style.width = b.style.height = lado + "px";
      b.style.setProperty("--tam-numero", lado * 0.11 + "px");
      b.style.setProperty("--tam-interrogante", lado * 0.55 + "px");
    }
  }

  tecla(e) {
    if (["1", "2", "3"].includes(e.key)) {
      const t = this.eleccion[Number(e.key) - 1];
      if (t) this.elegir(t);
    } else if (e.key === " ") {
      this.robot.pulsar();
    } else if (e.key === "Enter") {
      // Intro hace hablar al robot hasta contestar; después, Siguiente
      if (this.elegida) this.siguiente();
      else this.robot.pulsar();
    } else {
      return false;
    }
    return true;
  }
}

/* ---------- Grammar > Demonstratives ---------- */

function frasesDemostrativos(tarjetas) {
  const frases = [];
  for (const t of tarjetas) {
    for (const [demo, verbo, esPlural] of DEMOSTRATIVOS) {
      if (SOLO_PLURAL.has(t.nombre) && !esPlural) continue;
      frases.push({demo: capitalizar(demo), verbo, tarjeta: t, esPlural,
                   objeto: "the " + (esPlural ? plural(t.nombre) : t.nombre)});
    }
  }
  return frases;
}

class VistaDemostrativos {
  constructor() {
    this.aciertos = this.hechas = 0;
    this.marcador = crear("div", {class: "marcador"});
    this.marco = crear("div", {class: "marco"});
    this.hueco = crear("div", {class: "hueco"}, this.marco);
    new ResizeObserver(() => this.redimensionar()).observe(this.hueco);

    this.filas = [0, 1, 2].map(() => crear("div", {class: "paso"}));
    this.frase = crear("div", {class: "caja frase"});
    const cajas = crear("div", {class: "cajas"}, crear("div", {class: "caja pasos"}, ...this.filas), this.frase);

    this.accion = crear("button", {class: "boton fuerte", onclick: () => this.pulsarAccion()});
    this.robot = new Robot(() => this.corregida ? this.correctas.join(" ") : null);
    this.el = crear("section", {class: "vista"}, this.marcador, this.hueco, cajas,
                    crear("div", {class: "fila-botones"}, this.accion, this.robot.el));
  }

  entrar(tarjetas, nivel = 3) {
    this.tarjetas = tarjetas;
    this.pasos = NIVELES_DEMOSTRATIVOS[nivel];
    this.frases = [];
    this.aciertos = this.hechas = 0;
    this.siguiente();
  }

  siguiente() {
    if (!this.frases.length) this.frases = barajar(frasesDemostrativos(this.tarjetas));
    this.actual = this.frases.pop();
    this.corregida = false;
    this.robot.ponerAnimo(null);

    // Paso 3: el objeto correcto y otra opción: el mismo objeto en el otro número
    // (the pencil / the pencils) o un objeto distinto en el mismo número
    const {tarjeta, esPlural} = this.actual;
    let otro;
    if (!SOLO_PLURAL.has(tarjeta.nombre) && Math.random() < 0.5) {
      otro = "the " + (esPlural ? tarjeta.nombre : plural(tarjeta.nombre));
    } else {
      const otras = this.tarjetas.filter(t => t !== tarjeta && (esPlural || !SOLO_PLURAL.has(t.nombre)));
      const nombre = azar(otras).nombre;
      otro = "the " + (esPlural ? plural(nombre) : nombre);
    }
    // Demostrativos agrupados por cerca (This/These) y lejos (That/Those)
    this.opciones = [["This", "These", "That", "Those"], ["is", "are"], barajar([this.actual.objeto, otro])];
    this.correctas = [this.actual.demo, this.actual.verbo, this.actual.objeto];
    // Los pasos que no se eligen en este nivel ya vienen puestos
    this.elegido = this.correctas.map((c, i) => this.pasos.includes(i) ? null : c);

    this.lienzo = componerDemostrativo(this.actual.demo.toLowerCase(), tarjeta);
    this.marco.replaceChildren(this.lienzo);
    this.mostrar();
    this.redimensionar();
  }

  elegir(paso, texto) {
    if (this.corregida || (paso > 0 && !this.elegido[paso - 1])) return;  // cada paso, tras el anterior
    this.elegido[paso] = texto;
    this.mostrar();
  }

  pulsarAccion() {
    if (this.corregida) return this.siguiente();
    if (!this.elegido.every(Boolean)) return;
    this.corregida = true;
    this.hechas++;
    const bien = this.elegido.every((e, i) => e === this.correctas[i]);
    this.aciertos += bien;
    this.robot.ponerAnimo(bien ? "feliz" : "triste");
    this.mostrar();
    ejercicioHecho();
  }

  mostrar() {
    this.filas.forEach((fila, i) => {
      fila.style.display = this.pasos.includes(i) ? "" : "none";  // solo las filas de este nivel
      const activo = i === 0 || Boolean(this.elegido[i - 1]);  // bloqueado hasta elegir el anterior
      fila.replaceChildren(...this.opciones[i].map(t => {
        const b = crear("button", {onclick: () => this.elegir(i, t)}, t);
        b.disabled = !activo;  // tras comprobar siguen blancas; elegir() ya no deja cambiarlas
        if (this.corregida && t === this.correctas[i]) b.classList.add("correcta");
        else if (this.corregida && t === this.elegido[i]) b.classList.add("fallada");
        else if (t === this.elegido[i]) b.classList.add("elegido");
        return b;
      }));
    });
    this.frase.textContent = this.elegido.map(e => e || "___").join(" ") + ".";
    this.accion.textContent = this.corregida ? "Siguiente ▶" : "Comprobar ✔";
    this.accion.disabled = !this.corregida && !this.elegido.every(Boolean);
    this.robot.activo = this.corregida;
    this.marcador.textContent = `Aciertos: ${this.aciertos} / ${this.hechas}`;
  }

  redimensionar() {
    if (!this.lienzo) return;
    const [w, h] = encajar(this.hueco, 800 / 520, 40);
    this.lienzo.style.width = w + "px";
    this.lienzo.style.height = h + "px";
  }

  tecla(e) {
    if (e.key !== "Enter") return false;
    this.pulsarAccion();
    return true;
  }
}

/* ---------- Aviso de descanso ---------- */

function mostrarDescanso() {
  const cerrar = () => {
    document.removeEventListener("keydown", teclaModal, true);
    fondo.remove();
    vaciarCarga();
  };
  const teclaModal = e => {
    if (["Enter", "Escape", " "].includes(e.key)) cerrar();
    e.preventDefault();
    e.stopPropagation();  // mientras está abierto, el teclado no llega a los ejercicios
  };
  const caja = crear("div", {class: "modal", role: "dialog"});
  caja.innerHTML = svgRobot({animo: "sobrecargado", carga: 1});
  caja.append(
    crear("div", {class: "uf"}, "¡Uf, qué calor!"),
    crear("p", {}, `¡Has hecho ${EJERCICIOS_DESCANSO} ejercicios!`),
    crear("p", {}, "Necesito un descanso"),
    crear("button", {class: "boton", onclick: cerrar}, "¡Vale!"));
  const fondo = crear("div", {class: "modal-fondo"}, caja);
  document.body.append(fondo);
  document.addEventListener("keydown", teclaModal, true);
}
// Un segundo después del último ejercicio, para que antes vea si ha acertado
carga.alSobrecargar = () => setTimeout(mostrarDescanso, 1000);

/* ---------- Selector de robot (voz) ---------- */

/** Al abrir la app se elige el robot: el del lazo (voz femenina) o el del bigote (masculina). */
function mostrarSelector(alElegir) {
  const elegir = robot => {
    document.removeEventListener("keydown", teclaModal, true);
    fondo.remove();
    voz.robot = robot.voz;
    try { localStorage.setItem("robot", robot.voz); } catch { /* sin almacenamiento: no pasa nada */ }
    hablar("Hello!", () => {});
    if (alElegir) alElegir();
  };
  const teclaModal = e => {
    const n = Number(e.key);
    if (n >= 1 && n <= ROBOTS.length) elegir(ROBOTS[n - 1]);
    else if (e.key === "Enter" || e.key === " ") elegir(ROBOTS.find(r => r.voz === voz.robot) || ROBOTS[0]);
    e.preventDefault();
    e.stopPropagation();  // mientras está abierto, el teclado no llega a los ejercicios
  };
  const botones = ROBOTS.map(robot => {
    const b = crear("button", {class: "elegir-robot" + (robot.voz === voz.robot ? " ultimo" : ""),
                               "aria-label": robot.voz, onclick: () => elegir(robot)});
    b.innerHTML = svgRobot({adorno: robot.adorno});
    return b;
  });
  const caja = crear("div", {class: "modal selector", role: "dialog"},
    crear("p", {}, "¿Qué ayudante quieres?"),
    crear("div", {class: "robots"}, ...botones));
  const fondo = crear("div", {class: "modal-fondo"}, caja);
  document.body.append(fondo);
  document.addEventListener("keydown", teclaModal, true);
}

/* ---------- Menú y arranque ---------- */

const vistas = {
  vocab: new VistaVocabulario(),
  listen: new VistaListening(),
  grammar: new VistaDemostrativos(),
};
let vistaActual = null;

const menu = document.getElementById("menu");
const fondoMenu = document.getElementById("fondo-menu");
function abrirMenu(abierto) {
  menu.classList.toggle("abierto", abierto);
  fondoMenu.classList.toggle("visible", abierto);
}
document.getElementById("abrir-menu").addEventListener("click", () => abrirMenu(!menu.classList.contains("abierto")));
fondoMenu.addEventListener("click", () => abrirMenu(false));

function construirMenu() {
  const tipos = [...new Set(TARJETAS.map(t => t.tipo))].sort((a, b) => {
    const conocidos = Object.keys(NOMBRES_TIPO);
    const ia = conocidos.includes(a) ? conocidos.indexOf(a) : 99, ib = conocidos.includes(b) ? conocidos.indexOf(b) : 99;
    return ia - ib || a.localeCompare(b);
  });
  const subsecciones = [[TODOS, "All"], ...tipos.map(t => [t, nombreTipo(t)])];
  const apartados = [
    ["Grammar", Object.keys(NIVELES_DEMOSTRATIVOS).map(n => ["grammar", n, `Demonstratives · Level ${n}`])],
    // Cada sección de vocabulario tiene dos modos (iconos de la barra): estudiar y prueba de listening
    ["Vocabulary", subsecciones.map(([t, n]) => ["vocab", t, n])],
  ];
  for (const [titulo, opciones] of apartados) {
    menu.append(crear("h2", {}, titulo));
    for (const [vista, tipo, nombre] of opciones) {
      const b = crear("button", {onclick: () => abrirSeccion(vista, tipo, `${titulo} · ${nombre}`, b)}, nombre);
      menu.append(b);
    }
  }
  // Abajo del todo: elegir otro asistente (otra voz)
  menu.append(crear("div", {class: "menu-pie"}, crear("h2", {}, "Assistant"),
              crear("button", {onclick: () => { abrirMenu(false); mostrarSelector(); }}, "Change assistant")));
}

/* Iconos de la barra para los modos de Vocabulary: libro (estudiar) y bandera de cuadros (prueba) */
const SVG_LIBRO = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 28 C38 20 22 20 10 24 L10 80 C22 76 38 76 50 84 Z" fill="#5a8fd8" stroke="#282828" stroke-width="5" stroke-linejoin="round"/>
  <path d="M50 28 C62 20 78 20 90 24 L90 80 C78 76 62 76 50 84 Z" fill="#7aa9e8" stroke="#282828" stroke-width="5" stroke-linejoin="round"/>
  <path d="M20 38 C28 36 36 36 42 39 M20 50 C28 48 36 48 42 51 M58 39 C64 36 72 36 80 38 M58 51 C64 48 72 48 80 50"
        stroke="white" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`;
const SVG_BANDERA = (() => {
  let cuadros = "";
  for (let f = 0; f < 4; f++) {
    for (let c = 0; c < 5; c++) {
      if ((f + c) % 2 === 0) cuadros += `<rect x="${26 + c * 12}" y="${14 + f * 11}" width="12" height="11" fill="#282828"/>`;
    }
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="26" y="14" width="60" height="44" fill="white"/>${cuadros}
    <rect x="26" y="14" width="60" height="44" fill="none" stroke="#282828" stroke-width="4"/>
    <line x1="22" y1="10" x2="22" y2="92" stroke="#282828" stroke-width="7" stroke-linecap="round"/></svg>`;
})();
const MODOS_VOCAB = [["vocab", SVG_LIBRO, "Estudiar"], ["listen", SVG_BANDERA, "Prueba de listening"]];

const modosBarra = document.getElementById("modos-barra");
let tarjetasSeccion = [];

function abrirSeccion(vista, tipo, titulo, boton) {
  callar();
  vaciarCarga();  // cada sección empieza con el robot limpio
  menu.querySelectorAll("button").forEach(b => b.classList.toggle("activo", b === boton));
  document.getElementById("titulo").textContent = titulo;
  tarjetasSeccion = vista === "grammar" ? TARJETAS.filter(t => t.tipo === "classroom")
                                        : TARJETAS.filter(t => tipo === TODOS || t.tipo === tipo);
  if (vista === "vocab") {
    modosBarra.replaceChildren(...MODOS_VOCAB.map(([modo, icono, nombre]) => {
      const b = crear("button", {"data-modo": modo, title: nombre, "aria-label": nombre,
                                 onclick: () => ponerVista(modo)});
      b.innerHTML = icono;
      return b;
    }));
  } else {
    modosBarra.replaceChildren();
  }
  ponerVista(vista, vista === "grammar" ? Number(tipo) : undefined);
  abrirMenu(false);
}

/** Enseña una vista con las tarjetas de la sección. Cambiar de modo no vacía el robot. */
function ponerVista(vista, nivel) {
  callar();
  vistaActual = vistas[vista];
  modosBarra.querySelectorAll("button").forEach(b => b.classList.toggle("activo", b.dataset.modo === vista));
  document.getElementById("centro").replaceChildren(vistaActual.el);
  vistaActual.entrar(tarjetasSeccion, nivel);
}

// Tras pulsar un botón con el dedo o el ratón se le quita el foco: si no, Intro o Espacio
// lo volverían a pulsar además de hacer su atajo
document.addEventListener("click", e => {
  const boton = e.target.closest("button");
  if (boton) boton.blur();
});

document.addEventListener("keydown", e => {
  if (e.repeat || !vistaActual) return;
  if (e.key === "l" || e.key === "L") {
    vistaActual.robot.pulsar();  // L: habla el robot de la pantalla (si puede)
    e.preventDefault();
  } else if (vistaActual.tecla(e)) {
    e.preventDefault();
  }
});

precargar().then(() => {
  construirMenu();
  // Primero se elige robot; después, como no hay nada elegido, se enseña el menú
  mostrarSelector(() => abrirMenu(true));
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  // Cuando se publica una versión nueva, la app se recarga sola al recibirla
  // (sin esto, la versión nueva solo se vería al volver a abrir la app)
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (habiaVersion) location.reload();
  });
  navigator.serviceWorker.register("sw.js").then(r => r.update());
}
