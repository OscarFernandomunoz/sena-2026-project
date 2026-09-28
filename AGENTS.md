# AGENTS.md

Reglas de trabajo para este repositorio. Son convenciones acordadas con el usuario: aplicalas
sin que tengas que volver a pedirlas.

## Estructura: divide el código largo

Cuando escribas o modifiques código, **mantén los archivos pequeños y con una sola
responsabilidad**. Si un archivo crece o mezcla responsabilidades, divídelo antes de
terminar, no lo dejes para después.

- **Límite por archivo: ~200 líneas.** Por encima de eso, divide.
- **Una responsabilidad por archivo.** Un archivo que rellena un formulario, uno que navega
  y otro que hace clic son tres archivos, no uno con tres secciones.
- **Agrupa por carpeta, no por mega-archivo.** Cuando un módulo pase de ~200 líneas, conviértelo
  en una carpeta con un archivo por responsabilidad y un `index.ts` que solo reexporta la API
  pública. Quien consume el módulo sigue importando del mismo sitio.
- **El `index.ts` de una carpeta es un barril.** Solo reexporta. Si tiene lógica propia, esa
  lógica pertenece a un archivo con nombre propio.
- **Divide por flujo, no por tamaño de bloque.** Un helper de 60 líneas que hace una sola cosa
  se queda; tres helpers distintos de 60 líneas cada uno van en archivos distintos.

### Árbol de carpetas como API

Al convertir `foo.ts` en `foo/`, los imports pasan de `./foo.js` a `./foo/index.js` (convención
ya usada en `renderer/theme/`). Nadie fuera de la carpeta debe importar archivos internos.

## Restricción crítica: helpers inyectados en la página de SofiaPlus

`src/main/services/sofia-plus/{login,navigation,report}` exportan funciones que
`sofia-plus/index.ts` serializa con `.toString()` y ejecuta **dentro de la página de
SofiaPlus**. Por eso cada una de esas funciones debe ser **autocontenida**:

- No puede usar imports en tiempo de ejecución (solo `import type`, que TypeScript borra).
- No puede leer constantes ni variables de su módulo.
- No puede llamar a otro módulo.
- Los helpers auxiliares van **dentro** del cuerpo de la función.

Dividir estos archivos por responsabilidad está permitido y recomendado, pero cada función
debe seguir sin dependencias externas por sí sola.

`npm run check:serialized` compila esos módulos con la configuración real de esbuild y evalúa
cada función en un contexto sin módulos. Se ejecuta en `npm run build`, así que una
dependencia accidental rompe el build en lugar de fallar en producción.

## Antes de dar por terminado

```bash
npm run lint
npm run build
```

`build` ya ejecuta `tsc --noEmit` y la verificación de helpers serializados. Si tocaste
`package.json`, `tsconfig.json` o `eslint/`, ejecuta además `npm start` para comprobar que
Electron arranca.

## Estilo

- Comentarios y documentación en **español**, como el resto del repositorio.
- Comentarios que explican **por qué** se hace algo, no qué hace la línea siguiente.
- Respeta las reglas de `eslint.config.js` y `tsconfig.json` (`strict`,
  `noUnusedLocals`, `noUncheckedIndexedAccess`, etc.). No las relajes para que algo compile.
