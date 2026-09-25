// Script de parcheo que se inyecta en la página de SofiaPlus. No depende de nada para
// poder importarse tanto desde el guard de página como desde el registro de ventanas.

// Evita el error de SofiaPlus cuando llama $.unblockUI sin tener el plugin blockUI cargado.
export function patchBlockUiScript(): string {
  return `(() => {
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
    if (!window.__sofiaBlockUiPatch) {
      window.__sofiaBlockUiPatch = true;
      apply();
      window.addEventListener('load', apply, { once: true });
      // SofiaPlus puede recargar jQuery durante una petición JSF; el intervalo vuelve
      // a instalar los métodos si esa recarga reemplaza window.$ o window.jQuery.
      window.setInterval(apply, 50);
    }
    return apply();
  })()`;
}
