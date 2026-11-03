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

## Dual pane trên PS5

PS5 WebKit gần như chỉ chịu **1 video decoder / MSE**. Dual Shaka → 3015; thử native thứ 2 cũng hay kéo sập player chính.

Mặc định `DUAL_MODE = 'shaka-canvas'`:
- **left:** Shaka MSE (DASH, strip audio) — decoder thật
- **right:** `<canvas>` `drawImage` từ cùng `<video>` — chỉ preview/mirror, không decode stream thứ 2

Muốn 2 stream khác nhau: phải **đổi source trên 1 Shaka** (swap), không decode song song. Mode thí nghiệm còn lại: `hybrid` | `dual-mse` | `dual-native`.

## Streams

Hardcode trong `src/streams.ts`.
