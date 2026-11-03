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

Mặc định thí nghiệm `DUAL_MODE = 'shaka-webcodecs'` (cách C — **play được**, không chỉ 1 ảnh):
- **left:** Shaka MSE
- **right:** fetch fMP4 → **mp4box** → **WebCodecs** decode liên tục → canvas **loop** (không `<video>` 2)
- Bật right sau khi left `playing` — xem left có 3015 không (chung HW decoder?)

Mode khác: `shaka-telemetry` | `shaka-mp4` | `shaka-canvas` | `dual-mse` | …

## Streams

Hardcode trong `src/streams.ts`.
