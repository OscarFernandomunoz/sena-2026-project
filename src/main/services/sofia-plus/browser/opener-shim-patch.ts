// Da a los iframes del portal un equivalente de `window.opener`.
//
// El diálogo de instructor NO es una ventana emergente: es un iframe que carga
// `/sofia/fwk-webcommon/funcionario/modalFuncionario.faces`. Y un iframe, por definición del
// estándar HTML, nunca tiene `window.opener`: esa propiedad solo existe en las ventanas creadas
// con `window.open()`. Por eso `enviarParametro` (sofiaPopUp.js:27) revienta con
// "Cannot read properties of undefined (reading 'elements')". No le falta un permiso de
// Electron, le falta una propiedad que el estándar no define para iframes.
//
// El portal espera poder leer el DOM de la consulta a través de un "opener". En el iframe ese
// papel lo juega `window.parent`, que además es el mismo origen (senasofiaplus.edu.co), así que
// el acceso cruzado funciona sin relajar la seguridad.
//
// ⚠️ El script se inyecta con `executeJavaScript` dentro de la página: no puede referenciar
// nada del ámbito del módulo donde se declaró.

export function patchOpenerShimScript(): string {
  return `
    (() => {
      'use strict';

      // En la ventana principal no hay ningún iframe que reparar: se deja intacta.
      if (window.top === window) return 'ventana-principal';

      // Si el portal ya tiene un opener legitimo (popup real de window.open), no se toca.
      if (window.opener) return 'opener-ya-definido';

      const parent = window.parent;
      if (!parent || parent === window) return 'sin-padre-accesible';

      // 'opener' es un atributo de Window con getter. Se sombrea con una propiedad propia del
      // objeto window: defineProperty es el camino fiable y la asignación solo el respaldo.
      try {
        Object.defineProperty(window, 'opener', {
          value: parent,
          configurable: true,
          writable: false,
          enumerable: false,
        });
      } catch {
        try { window.opener = parent; } catch { /* el marco bloquea la escritura */ }
      }

      // Se comprueba de verdad: si el marco rechaza la escritura, el flujo debe enterarse ahora
      // y no tres pasos mas tarde con un error de sofiaPopUp.js que no senala su origen.
      const aplicado = window.opener !== undefined && window.opener !== null;
      console.log('[Parche] opener del iframe: ' + (aplicado ? 'asignado a window.parent' : 'NO se pudo asignar'));
      return aplicado ? 'opener-asignado' : 'fallo';
    })()
  `;
}