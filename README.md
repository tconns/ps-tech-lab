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

Kết luận lab (PS5 FW 13, đã reproduce):
- Dual Shaka MSE → 3015
- `captureStream` thiếu; canvas từ MSE → **frame đen**
- Bật **MP4 native thứ 2** khi Shaka đang play → left 3015 ngay (`Media failed to decode`)
- ⇒ **1 HW video decoder** — không decode 2 video song song

Mặc định `DUAL_MODE = 'shaka-telemetry'`:
- **left:** Shaka MSE (decode thật)
- **right:** poster + telemetry từ cùng `<video>` (không decoder 2)

Muốn 2 stream: **swap source trên 1 Shaka**. Mode thí nghiệm: `shaka-mp4` | `shaka-canvas` | `dual-mse` | …

## Streams

Hardcode trong `src/streams.ts`.
