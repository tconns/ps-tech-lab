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

Kết luận lab trên PS5 FW 13:
- Dual **Shaka MSE** → 3015 `MEDIA_SOURCE_OPERATION_THREW`
- **`captureStream` thiếu**; **canvas `drawImage` từ MSE → frame đen**
- HLS blob native → `NotSupportedError`

Mặc định `DUAL_MODE = 'shaka-mp4'`:
- **left:** Shaka MSE + DASH (strip audio)
- **right:** progressive **MP4** native (không MSE) — lên hình thật nếu HW cho phép; theo dõi left có 3015 sau khi right start

`shaka-canvas` giữ để tái hiện MSE→canvas black. Mode khác: `dual-mse` | `hybrid` | `dual-native`.

## Streams

Hardcode trong `src/streams.ts`.
