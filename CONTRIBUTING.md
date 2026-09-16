# Contributing

Thank you for your interest in contributing to Ahorro Instructor Automatizado (AIA).

## Requirements

Before installing the application, make sure you have:

- Windows 10 or Windows 11.
- Node.js 22 LTS. Node.js 22.14.0 is the recommended version.
- npm 10 or a compatible version included with Node.js.
- Git, if you are cloning the repository.
- Microsoft Visual C++ Redistributable 2015-2022 for x64, required by Electron's native components.

Node.js 24 may cause Electron's native extraction dependency to fail on some Windows installations. Use Node.js 22 LTS for the most reliable setup.

## Installation

Clone the repository and install its dependencies:

```powershell
git clone <repository-url>
cd oscar-fernando
npm install
```

## Run the Application

Start the application in development mode:

```powershell
npm run dev
```

This command builds the source files and opens the Electron application. Keep the terminal open while using development mode.

To run the production-style application after building it, use:

```powershell
npm start
```

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Builds the project and starts Electron with source watching enabled. |
| `npm run build` | Builds the application into the `dist` directory. |
| `npm run watch` | Rebuilds the application when source files change. |
| `npm run lint` | Checks the project with ESLint. |
| `npm start` | Runs linting, builds the project, and starts Electron. |

## Development Guidelines

- Keep source code under `src/`.
- Do not commit `node_modules/` or generated files from `dist/`.
- Run `npm run lint` before submitting changes.
- Keep changes focused and preserve the existing TypeScript and Electron structure.
- Add or update documentation when a change affects setup or usage.

## Troubleshooting

### Electron does not start

Confirm that Node.js 22 LTS is active:

```powershell
node --version
npm --version
```

Then reinstall the dependencies:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run dev
```

If the error mentions `ERR_DLOPEN_FAILED` or a missing native binding, install or repair the Microsoft Visual C++ Redistributable 2015-2022 for x64, restart Windows, and repeat the installation steps.

### The application window does not open

Check the terminal for build errors and run the following commands separately:

```powershell
npm run lint
npm run build
```

Fix any reported errors before starting Electron again.
