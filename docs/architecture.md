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
│   │       ├── browser.ts                # Ventanas, frames y acciones del navegador
│   │       ├── login.ts                  # Helpers del formulario de login
│   │       ├── navigation.ts             # Helpers de navegación del portal
│   │       ├── report.ts                 # Helpers del reporte y docente
│   │       └── types.ts                  # Tipos de la automatización
│   └── windows/
│       ├── appearance.ts                 # Apariencia compartida de ventanas
│       └── manager.ts                    # Ciclo de vida de la ventana principal
├── preload/
│   └── index.ts                          # Puente seguro renderer -> main
├── renderer/
│   ├── index.html                        # Estructura HTML
│   ├── index.ts                          # Inicialización del renderer
│   ├── style.css                         # Estilos visuales
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

## Salida de compilación

El script de compilación genera los tres puntos de entrada de Electron en:

```text
dist/
├── main/index.js
├── preload/index.js
└── renderer/index.js
```
