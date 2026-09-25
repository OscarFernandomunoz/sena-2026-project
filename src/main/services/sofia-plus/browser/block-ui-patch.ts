// Script de parcheo que se inyecta en la página de SofiaPlus. No depende de nada para
// poder importarse tanto desde el guard de página como desde el registro de ventanas.

// Evita el error de SofiaPlus cuando llama $.unblockUI sin tener el plugin blockUI cargado.
// El shim se instala aunque jQuery todavía no exista, y un sondeo lo aplica en cuanto llega:
// el diálogo de instructor se inyecta en un iframe que carga su propio jQuery más tarde.
export function patchBlockUiScript(): string {
  return `(() => {
    'use strict';
    const apply = () => {
      const candidates = [window.jQuery, window.$].filter(Boolean);
      if (!candidates.length) return false;
      candidates.forEach((jq) => {
        try {
          if (typeof jq.unblockUI !== 'function') jq.unblockUI = function unblockUI() {};
          if (typeof jq.blockUI !== 'function') jq.blockUI = function blockUI() {};
        } catch {
          // Algunas versiones pueden definir propiedades de jQuery como no editables.
        }
      });
      return candidates.every((jq) => typeof jq.unblockUI === 'function');
    };

    if (window.__sofiaBlockUiPatch) return apply();
    window.__sofiaBlockUiPatch = true;

    // Sondeo rápido hasta que aparezca jQuery y luego uno lento de seguridad: una petición
    // JSF puede recargar jQuery y dejar el diálogo sin blockUI otra vez.
    let slow = false;
    let timer = 0;
    const poll = () => {
      if (slow) { apply(); return; }
      if (!apply() || !timer) return;
      slow = true;
      window.clearInterval(timer);
      timer = window.setInterval(apply, 2000);
    };

    timer = window.setInterval(poll, 50);
    window.addEventListener('load', poll, { once: true });
    return apply();
  })()`;
}
