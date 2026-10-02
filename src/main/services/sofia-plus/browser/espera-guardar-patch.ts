// Parchea la función esperaGuardar del portal para que funcione dentro de Electron.
//
// El portal intenta acceder a .style del elemento 'cargando' (utiles.js:339),
// pero ese elemento no existe en el DOM en Electron. En el navegador funciona
// porque el portal lo crea dinámicamente, pero en Electron no se crea.
//
// Este parche crea el elemento 'cargando' antes de ejecutar la función original.
//
// ⚠️ Esta función se serializa con `.toString()` y se ejecuta dentro de la página de
// SofiaPlus. NO puede referenciar imports, constantes de módulo ni helpers externos.

export function patchEsperaGuardarScript(): string {
  return `
    (() => {
      // Si la función ya fue parcheada, no hacer nada.
      if (window.__esperaGuardarPatched) return;

      // Guardar la función original
      const original = window.esperaGuardar;
      if (typeof original !== 'function') return;

      // Función auxiliar: crear el elemento 'cargando' si no existe
      const ensureCargando = () => {
        let el = document.getElementById('cargando');
        if (!el) {
          el = document.createElement('div');
          el.id = 'cargando';
          el.style.visibility = 'hidden';
          el.style.position = 'fixed';
          el.style.top = '0';
          el.style.left = '0';
          el.style.width = '100%';
          el.style.height = '100%';
          el.style.backgroundColor = 'rgba(0,0,0,0.5)';
          el.style.zIndex = '9999';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.innerHTML = '<div style="color:white;font-size:24px;">Cargando...</div>';
          document.body.appendChild(el);
          console.log('[Parche] Elemento "cargando" creado');
        }
        return el;
      };

      // Función parcheada que crea el elemento antes de ejecutar la original
      window.esperaGuardar = function(...args) {
        // Crear el elemento 'cargando' antes de ejecutar la función original
        ensureCargando();
        
        try {
          // Intentar ejecutar la función original
          return original.apply(this, args);
        } catch (e) {
          // Si aún falla, registrar el error
          console.warn('[Parche] esperaGuardar falló:', e);
        }
      };

      // Marcar como parcheada
      window.__esperaGuardarPatched = true;
      console.log('[Parche] esperaGuardar parcheado correctamente');
    })();
  `;
}
