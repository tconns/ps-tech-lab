# PS Tech Lab — Dual Shaka Player Design

Date: 2026-11-03  
Status: Approved (conversational design)

## Purpose

Deploy a minimal PlayStation TechLab web app: a black full-viewport page with two Shaka Players side-by-side, each playing a hardcoded Google/Shaka demo DASH stream. Built for Dokploy via Docker (static SPA behind nginx). Target use includes testing playback in the PS5 browser.

## Goals / Non-goals

**Goals**
- Vite + React + TypeScript SPA
- Two players, 50/50 split screen
- Hardcoded Google/Shaka demo stream URLs
- `react-router-dom` with a single `/` route (ready for later routes)
- Multi-stage Docker image (Node build → nginx) for Dokploy

**Non-goals (v1)**
- Custom controls, DRM, analytics
- URL/query or UI-editable stream sources
- Backend / API
- Native PS5 packaging

## Stack

| Layer | Choice |
|-------|--------|
| Bundler | Vite |
| UI | React + TypeScript |
| Routing | `react-router-dom` |
| Player | `shaka-player` |
| Serve | nginx (Alpine) |
| Deploy | Dokploy, Dockerfile at repo root, port 80 |

## Architecture

```
Browser (PS5 / desktop)
  → nginx :80
    → index.html + hashed assets
      → React Router `/` → DualPlayerPage
        → PlayerPane (left)  + PlayerPane (right)
          → shaka.Player → <video>
```

Build pipeline: `npm ci` → `npm run build` → copy `dist/` into nginx image.

## UI

- Full viewport, background `#000`, no chrome
- Desktop: two columns, 50/50 horizontal
- Narrow / portrait: stack 50/50 vertical
- Each pane: `<video>` fills the pane, `object-fit: contain`
- No control bar in v1
- Autoplay; mute if the browser blocks unmuted autoplay; loop

## Components

- `App` — `BrowserRouter`, routes
- `DualPlayerPage` — split layout; imports stream constants
- `PlayerPane` — props: `src: string`, `label?: string`
  - On mount: create `shaka.Player`, attach to video, `load(src)`
  - On unmount: `player.destroy()`
  - On error: `console.error` only (UI stays black)

## Stream sources

Hardcoded in one constants module (e.g. `src/streams.ts`):

- **Left:** Big Buck Bunny (DASH) — official Shaka demo / Google sample URL
- **Right:** Sintel (DASH) — official Shaka demo / Google sample URL

Exact URLs are taken from the current Shaka Player demo asset list at implementation time. Changing streams later is a one-file edit.

## Routing

| Path | Page |
|------|------|
| `/` | `DualPlayerPage` |

No other routes in v1. Router is installed so additional pages can be added without rewiring.

## Docker / Dokploy

**Dockerfile (multi-stage)**
1. `node:22-alpine` — install deps, `npm run build`
2. `nginx:alpine` — copy `dist/` and `nginx.conf`, expose `80`

**nginx.conf**
- Root: `/usr/share/nginx/html`
- SPA fallback: `try_files $uri $uri/ /index.html`
- Long-cache hashed assets; no-cache `index.html`

**Supporting files**
- `.dockerignore` — `node_modules`, `dist`, `.git`, docs tooling noise
- Optional `docker-compose.yml` for local `docker compose up --build`

**Dokploy**
- Build from root Dockerfile
- Publish port `80`
- No environment variables required for v1

## Testing (v1)

- Local: `npm run dev` — both panes load and play
- Docker: build image, open `:80`, confirm dual playback and refresh of `/` works (SPA)
- Manual check on PS5 browser after Dokploy deploy when available

## Out of scope follow-ups

- Shared play/pause, bitrate HUD, DRM tests
- Query-param or env-driven URLs
- Additional lab routes beyond `/`
