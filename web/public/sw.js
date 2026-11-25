// ==========================================
// ARCA NOVA
// SERVICE WORKER
// ==========================================

const CACHE_NAME = "multiempresa-go-v3";

const OFFLINE_URL = "/offline.html";


// ==========================================
// A. INSTALAR
// ==========================================

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL);
    })

  );

  self.skipWaiting();

});


// ==========================================
// B. ACTIVAR
// ==========================================

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches.keys().then(async (nombres) => {

      await Promise.all(

        nombres

          .filter((nombre) =>
            nombre.startsWith("multiempresa-go-") &&
            nombre !== CACHE_NAME
          )

          .map((nombre) =>
            caches.delete(nombre)
          )

      );

      await self.clients.claim();

    })

  );

});


// ==========================================
// C. COMPROBAR CONEXION
// ==========================================

// NO GUARDAMOS DATOS PRIVADOS DE FIREBASE.
// SOLO MOSTRAMOS UNA PAGINA INFORMATIVA
// CUANDO NO HAY INTERNET.

self.addEventListener("fetch", (event) => {

  // MANIFIESTO E ICONOS DE CADA EMPRESA,
  // GUARDADOS EN EL CELULAR POR LA PROPIA WEB.

  const direccion = new URL(event.request.url);

  if (
    direccion.origin === self.location.origin &&
    direccion.pathname.startsWith("/m/")
  ) {

    event.respondWith(

      caches.open("an-marca")
        .then((cache) => cache.match(direccion.pathname))
        .then((guardado) => guardado || fetch(event.request))

    );

    return;
  }

  if (
    event.request.mode !== "navigate"
  ) {
    return;
  }

  event.respondWith(

    fetch(event.request).catch(async () => {

      const pagina = await caches.match(
        OFFLINE_URL
      );

      return pagina || Response.error();

    })

  );

});