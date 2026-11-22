// Sonidos de la interfaz generados con Web Audio: no hay archivos que cargar.
// Todos son cortos y suaves; se pueden silenciar y la elección se recuerda.

const CLAVE = "an-sonido";

let contexto = null;
let maestro = null;
let bufferRuido = null;

export function sonidoActivo() {
  try {
    return localStorage.getItem(CLAVE) !== "0";
  } catch {
    return true;
  }
}

export function fijarSonido(activo) {
  try {
    localStorage.setItem(CLAVE, activo ? "1" : "0");
  } catch {
    /* sin almacenamiento: se queda en memoria de la sesión */
  }
}

function audio() {
  if (!sonidoActivo()) {
    return null;
  }

  const Motor = window.AudioContext || window.webkitAudioContext;

  if (!Motor) {
    return null;
  }

  // Sin una pulsación previa el navegador bloquea el audio: no se crea todavía
  if (!contexto && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    return null;
  }

  if (!contexto) {
    contexto = new Motor();
    maestro = contexto.createGain();
    maestro.gain.value = 0.55;
    maestro.connect(contexto.destination);
  }

  if (contexto.state === "suspended") {
    contexto.resume();
  }

  return contexto;
}

const semitonos = (frecuencia, pasos) => frecuencia * Math.pow(2, pasos / 12);

function tono({
  frecuencia,
  hasta,
  inicio = 0,
  duracion = 0.12,
  tipo = "sine",
  volumen = 0.18,
  ataque = 0.005,
  destino
}) {
  const c = audio();

  if (!c) {
    return;
  }

  const t0 = c.currentTime + inicio;
  const oscilador = c.createOscillator();
  const ganancia = c.createGain();

  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frecuencia, t0);

  if (hasta) {
    oscilador.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);
  }

  ganancia.gain.setValueAtTime(0.0001, t0);
  ganancia.gain.exponentialRampToValueAtTime(volumen, t0 + ataque);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);

  oscilador.connect(ganancia);
  ganancia.connect(destino || maestro);

  oscilador.start(t0);
  oscilador.stop(t0 + duracion + 0.05);
}

function soplo({ inicio = 0, duracion = 0.5, desde = 500, hasta = 4000, volumen = 0.16, destino }) {
  const c = audio();

  if (!c) {
    return;
  }

  if (!bufferRuido) {
    bufferRuido = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const datos = bufferRuido.getChannelData(0);

    for (let i = 0; i < datos.length; i += 1) {
      datos[i] = Math.random() * 2 - 1;
    }
  }

  const t0 = c.currentTime + inicio;
  const fuente = c.createBufferSource();
  const filtro = c.createBiquadFilter();
  const ganancia = c.createGain();

  fuente.buffer = bufferRuido;
  fuente.loop = true;

  filtro.type = "bandpass";
  filtro.Q.value = 1.2;
  filtro.frequency.setValueAtTime(desde, t0);
  filtro.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);

  ganancia.gain.setValueAtTime(0.0001, t0);
  ganancia.gain.exponentialRampToValueAtTime(volumen, t0 + duracion * 0.35);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);

  fuente.connect(filtro);
  filtro.connect(ganancia);
  ganancia.connect(destino || maestro);

  fuente.start(t0);
  fuente.stop(t0 + duracion + 0.05);
}

// Campanilla de la puerta de una tienda: dos "ding" con armónicos
function campanilla({ inicio = 0, pasos = 0, volumen = 0.16, destino }) {
  [0, 0.22].forEach((retraso) => {
    [
      [1318.5, 1],
      [2637, 0.45],
      [3951, 0.2]
    ].forEach(([frecuencia, peso]) => {
      tono({
        frecuencia: semitonos(frecuencia, pasos),
        inicio: inicio + retraso,
        duracion: 1.1,
        volumen: volumen * peso,
        ataque: 0.004,
        destino
      });
    });
  });
}

// ---------------------------------------------------------------
// SONIDOS PÚBLICOS
// ---------------------------------------------------------------

export function sonidoClick() {
  tono({ frecuencia: 720, hasta: 430, duracion: 0.07, volumen: 0.12 });
  tono({ frecuencia: 1500, duracion: 0.035, volumen: 0.04, tipo: "triangle" });
}

export function sonidoPop() {
  tono({ frecuencia: 460, hasta: 920, duracion: 0.1, volumen: 0.13 });
}

export function sonidoError() {
  tono({ frecuencia: 196, hasta: 170, duracion: 0.2, volumen: 0.14, tipo: "triangle" });
  tono({ frecuencia: 156, hasta: 130, inicio: 0.13, duracion: 0.28, volumen: 0.14, tipo: "triangle" });
}

export function sonidoExito() {
  [523.25, 659.25, 783.99, 1046.5].forEach((frecuencia, indice) => {
    tono({
      frecuencia,
      inicio: indice * 0.09,
      duracion: 0.38,
      volumen: 0.13,
      tipo: "triangle"
    });
  });
}

// El avión de papel despega
export function sonidoDespegue() {
  soplo({ duracion: 0.65, desde: 450, hasta: 4200, volumen: 0.15 });
  tono({ frecuencia: 620, hasta: 1500, duracion: 0.55, volumen: 0.05, tipo: "sine" });
}

// Bienvenida: golpe del toldo, campanilla, destellos, marcas y remate.
// Devuelve una función para cortarlo si la persona salta la animación.
export function sonidoBienvenida({ pasos = 0 } = {}) {
  const c = audio();

  if (!c) {
    return () => {};
  }

  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(maestro);

  // Toldo al caer
  soplo({ inicio: 0.2, duracion: 0.5, desde: 300, hasta: 1200, volumen: 0.1, destino: bus });
  tono({ frecuencia: 150, hasta: 70, inicio: 0.62, duracion: 0.22, volumen: 0.2, destino: bus });

  // Campanilla de tienda
  campanilla({ inicio: 0.8, pasos, destino: bus });

  // Destellos
  [1760, 2093, 2349, 2637].forEach((frecuencia, indice) => {
    tono({
      frecuencia: semitonos(frecuencia, pasos),
      inicio: 1.05 + indice * 0.12,
      duracion: 0.25,
      volumen: 0.05,
      destino: bus
    });
  });

  // Tres marcas de la lista
  [1.45, 2.0, 2.55].forEach((inicio) => {
    tono({ frecuencia: semitonos(880, pasos), hasta: semitonos(1175, pasos), inicio, duracion: 0.11, volumen: 0.1, destino: bus });
  });

  // Remate
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frecuencia, indice) => {
    tono({
      frecuencia: semitonos(frecuencia, pasos),
      inicio: 3.0 + indice * 0.07,
      duracion: 0.5,
      volumen: 0.1,
      tipo: "triangle",
      destino: bus
    });
  });

  return () => {
    const ahora = c.currentTime;
    bus.gain.cancelScheduledValues(ahora);
    bus.gain.setValueAtTime(bus.gain.value, ahora);
    bus.gain.linearRampToValueAtTime(0.0001, ahora + 0.15);
  };
}

// Tono que va subiendo mientras se mantiene pulsado un botón peligroso.
// Devuelve una función para cortarlo si se suelta antes de tiempo.
export function sonidoMantener(segundos = 1.1) {
  const c = audio();

  if (!c) {
    return () => {};
  }

  const t0 = c.currentTime;
  const oscilador = c.createOscillator();
  const ganancia = c.createGain();

  oscilador.type = "triangle";
  oscilador.frequency.setValueAtTime(180, t0);
  oscilador.frequency.exponentialRampToValueAtTime(620, t0 + segundos);

  ganancia.gain.setValueAtTime(0.0001, t0);
  ganancia.gain.exponentialRampToValueAtTime(0.1, t0 + 0.08);

  oscilador.connect(ganancia);
  ganancia.connect(maestro);
  oscilador.start(t0);

  let cortado = false;

  const cortar = () => {
    if (cortado) {
      return;
    }

    cortado = true;
    const ahora = c.currentTime;

    ganancia.gain.cancelScheduledValues(ahora);
    ganancia.gain.setValueAtTime(Math.max(ganancia.gain.value, 0.0001), ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.12);
    oscilador.stop(ahora + 0.15);
  };

  // Si nadie lo corta, termina solo al cumplirse el tiempo
  oscilador.stop(t0 + segundos + 0.05);
  oscilador.onended = () => {
    cortado = true;
  };

  return cortar;
}

// Golpe seco cuando se confirma borrar o suspender
export function sonidoPeligroConfirmado() {
  tono({ frecuencia: 160, hasta: 55, duracion: 0.28, volumen: 0.22 });
  soplo({ duracion: 0.35, desde: 2400, hasta: 400, volumen: 0.1 });
}

// Venta cobrada: un "ka" seco y un "ching" de campanilla, como una caja registradora
export function sonidoCaja() {
  tono({ frecuencia: 900, hasta: 520, duracion: 0.06, volumen: 0.14, tipo: "triangle" });
  [
    [1975.5, 0.13],
    [2637, 0.07],
    [3951, 0.035]
  ].forEach(([frecuencia, volumen]) => {
    tono({ frecuencia, inicio: 0.07, duracion: 0.75, volumen, ataque: 0.003 });
  });
  tono({ frecuencia: 1568, inicio: 0.2, duracion: 0.45, volumen: 0.07 });
}
