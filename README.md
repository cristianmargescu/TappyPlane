# Tappy Plane

A browser-first arcade flight game built with Phaser, TypeScript, and Vite. It reuses the original artwork in `Assets/Textures`.

The legacy Unity and UWP project files are preserved in the repository, but are not needed to run the browser game.

## Run locally

Requires Node.js 26 LTS or newer.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Click or press Space to fly; avoid the rocks. Use **Restart flight** to start over.

Create a production build with `npm run build`.

## Published Windows server

The game is available at http://IOTSERVER:5001/ on the local network.
Production files are in `\\IOTSERVER\apps\tappyplane` (`C:\Apps\tappyplane` on the server).

IIS serves the production build through the `TappyPlane` site and application pool.
The required IIS static-content and default-document features are installed.
The site starts automatically, and the Windows firewall allows inbound TCP 5001
from the local subnet. The unused IIS default site is stopped.
Node.js and Unity are not required on the server; Node.js is only needed on the
development machine to build the app.

To publish an update from the repository root, build successfully first, then
copy the assets before replacing the entry page:

```powershell
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed' }
Copy-Item '.\dist\assets' '\\IOTSERVER\apps\tappyplane' -Recurse -Force
Copy-Item '.\dist\index.html' '\\IOTSERVER\apps\tappyplane\index.html' -Force
```

Open http://IOTSERVER:5001/ to verify the update. No development server or
interactive terminal needs to remain open.

The original Unity tutorial is available [here](http://anwell.me/articles/unity3d-flappy-bird/).