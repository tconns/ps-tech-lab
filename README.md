# PS Tech Lab

PlayStation TechLab — PS5 browser playback lab (Shaka + Docker/Dokploy).

## Dev

```bash
npm install
npm run dev
```

## Docker Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Mở http://localhost:8080.

## Dokploy

Docker Compose + `docker-compose.yml`. Chi tiết: [docs/DOKPLOY.md](docs/DOKPLOY.md).

## PS5 dual-player conclusion

**Dual live video không khả thi** trên PS5 WebView (FW 13): 1 HW decoder; không WebCodecs; không WebAssembly.

Báo cáo đầy đủ: **[docs/PS5-DUAL-PLAYER-FINDINGS.md](docs/PS5-DUAL-PLAYER-FINDINGS.md)**.

Lab hiện tại:
- **main:** 1× Shaka MSE (DASH, strip audio)
- **side:** poster + telemetry (không decode thứ 2)

## Platform

- `isPs5Runtime()` / `bootstrap()` từ `@osiris-smarttv/device` (theo react-playstation)
