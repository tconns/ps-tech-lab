# PS Tech Lab

PlayStation TechLab — dual Shaka Player (split screen), nền đen. Deploy Docker → Dokploy.

## Dev

```bash
npm install
npm run dev
```

## Docker Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Mở http://localhost:8080. (Dokploy chỉ dùng `docker-compose.yml` với `expose: 80`, không bind host port.)

## Dokploy

Dùng loại **Docker Compose** + file `docker-compose.yml`. Xem [docs/DOKPLOY.md](docs/DOKPLOY.md).

## Platform / MSDK

Boot theo `react-playstation`:
- `isPs5Runtime()` — chỉ true khi có `window.msdk`
- `resolveForcedDevicePlatform()` — UA PS5 spoof không có msdk → Web adapter
- `bootstrap()` từ `@osiris-smarttv/device` — preload MSDK rồi mới mount dual player

## Streams

Hardcode trong `src/streams.ts` (Google / Shaka demo DASH).
