# Estructura del proyecto

La aplicación es un proyecto de Electron organizado por proceso y responsabilidad.

```text
src/
├── main/
│   ├── index.ts                         # Inicialización de Electron
│   ├── ipc/
│   │   └── handlers.ts                  # Canales IPC y acciones del proceso principal
│   ├── services/
│   │   └── sofia-plus/                  # Automatización de SofiaPlus
│   │       ├── index.ts                  # Orquestación del flujo
│   │       ├── login.ts                  # Helper del formulario de login
│   │       ├── navigation.ts             # Helpers de navegación del portal
│   │       ├── types.ts                  # Tipos de la automatización
│   │       ├── browser/                  # Capa de navegador (ventanas, frames, clics)
│   │       │   ├── index.ts              # API pública de la capa
│   │       │   ├── timing.ts             # Espera entre acciones
│   │       │   ├── block-ui-patch.ts     # Script de parcheo de jQuery blockUI
│   │       │   ├── page-guards.ts        # Aplicación de parches a todos los frames
│   │       │   ├── window-tracker.ts     # Ventanas emergentes y reenvío de consola
│   │       │   ├── frames.ts             # Recorrido de frames y executeJavaScript
│   │       │   └── click.ts              # Clic por coordenadas, marcador y scripts
│   │       ├── flow/                     # Piezas del flujo de automatización
│   │       │   ├── step-banner.ts        # Contador de progreso en la página
│   │       │   └── window-loader.ts      # Creación y carga de la ventana del portal
│   │       └── report/                   # Helpers del reporte y docente
│   │           ├── index.ts              # API pública de los helpers
│   │           ├── dates.ts              # Campos de fecha del reporte
│   │           ├── instructor-picker.ts  # Apertura del diálogo de instructor
│   │           ├── identification-type.ts# Tipo de identificación (cédula)
│   │           ├── identification-field.ts # Campo del número de identificación
│   │           ├── search-button.ts      # Input "Consultar" del instructor
│   │           └── result-link.ts        # Enlace del instructor y popup
│   └── windows/
│       ├── appearance.ts                 # Opciones nativas y ciclo de la barra de título
│       ├── palette.ts                    # Colores de la barra por tema
│       ├── remote-chrome.ts              # Cromo inyectado en páginas remotas
│       └── manager.ts                    # Ciclo de vida de la ventana principal
├── preload/
│   └── index.ts                          # Puente seguro renderer -> main
├── renderer/
│   ├── index.html                        # Estructura HTML
│   ├── index.ts                          # Inicialización del renderer
│   ├── styles/                           # Estilos CSS modulares
│   │   ├── index.css                     # Entrada e imports de estilos
│   │   ├── tokens.css                    # Variables y temas
│   │   ├── base.css                      # Reset y base global
│   │   ├── title-bar.css                 # Barra y controles de ventana
│   │   ├── layout.css                    # Layout y paneles
│   │   ├── theme.css                     # Selector de tema
│   │   ├── icons.css                     # SVG y animaciones de iconos
│   │   ├── forms.css                     # Formularios e inputs
│   │   ├── dropzone.css                  # Zona de carga y estados
│   │   ├── illustration.css              # Ilustración del dropzone
│   │   ├── excel-preview.css             # Vista previa y filtros de Excel
│   │   ├── submit.css                    # Botón principal y estados
│   │   ├── status-bar.css                # Barra inferior, reloj y clima
│   │   ├── animations.css                # Keyframes compartidas
│   │   └── responsive.css                # Media queries y reduced motion
│   ├── types.ts                          # Tipos de estado y elementos
│   ├── components/
│   │   ├── excel-preview.ts              # Carga y vista previa de Excel
│   │   ├── live-context.ts               # Reloj, ubicación y clima
│   │   ├── submit.ts                     # Orquestación del envío/login
│   │   ├── theme-selector.ts             # Eventos DOM del selector de tema
│   │   └── title-bar.ts                  # Sincronización de la barra nativa
│   └── theme/
│       ├── index.ts                      # API pública del módulo de temas
│       ├── theme-service.ts              # Estado, persistencia y tema del sistema
│       └── types.ts                      # Tipos y etiquetas de temas
└── shared/
    └── window.ts                         # Tipos y constantes compartidos
```

## Límites entre procesos

- `main` es responsable de ventanas, automatización y APIs privilegiadas de Electron.
- `preload` expone una API pequeña y explícita mediante `contextBridge`.
- `renderer` contiene la interfaz y nunca accede directamente a Node.
- `shared` contiene código que debe coincidir entre `main`, `preload` y `renderer`.

## Flujo del tema

- `renderer/theme/theme-service.ts` controla el estado, `localStorage`, los cambios del sistema y el tema claro/oscuro resuelto.
- `renderer/components/theme-selector.ts` solo maneja el DOM y los clics del selector.
- `renderer/components/title-bar.ts` se suscribe a los cambios para actualizar los controles nativos.
- `renderer/theme/types.ts` contiene los tipos y las etiquetas de los temas.

## Automatización de SofiaPlus

- `sofia-plus/index.ts` solo orquesta: delega el banner, la carga de la ventana y cada paso.
- `sofia-plus/browser/` encapsula todo lo que habla con Electron: parches de página, recorrido
  de frames, ventanas emergentes y clics. `window-tracker.ts` es la única dueño del estado de
  ventanas emergentes; `frames.ts` lo consulta mediante `getTrackedChildWindows`.
- `sofia-plus/flow/` contiene las piezas del flujo (banner de progreso y carga de la ventana).
- `sofia-plus/report/` divide el reporte por paso: fechas, apertura del diálogo, tipo y campo
  de identificación, botón de búsqueda y enlace de resultado.
- Los módulos son carpetas con un `index.ts` barril. Quien consume importa de `browser/index.js`
  o `report/index.js`, nunca de un archivo interno.

## Helpers inyectados en la página

`sofia-plus/index.ts` inyecta los helpers de `login.ts`, `navigation.ts` y `report/` con
`.toString()` y los ejecuta dentro de la página de SofiaPlus. Cada uno debe ser autocontenido:
sin imports en tiempo de ejecución, sin constantes de módulo y sin llamadas a otros módulos.

`npm run check:serialized` compila esos módulos con la configuración real de esbuild y evalúa
cada función en un contexto sin módulos, para detectar dependencias que romperían la
inyección en producción. `npm run build` lo ejecuta automáticamente.

## Salida de compilación

El script de compilación genera los tres puntos de entrada de Electron en:

```text
dist/
├── main/index.js
├── preload/index.js
└── renderer/index.js
```
