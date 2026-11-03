# PS Tech Lab

PlayStation TechLab — dual-pane playback experiments for PS5 browser (Shaka + Docker/Dokploy).

## Dev

```bash
npm install
npm run dev
```

## Docker Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Mở http://localhost:8080. (Dokploy chỉ dùng `docker-compose.yml` với `expose: 80`.)

## Dokploy

Dùng loại **Docker Compose** + file `docker-compose.yml`. Xem [docs/DOKPLOY.md](docs/DOKPLOY.md).

## Platform / MSDK

- `isPs5Runtime()` — chỉ true khi có `window.msdk`
- `resolveForcedDevicePlatform()` — UA PS5 spoof không có msdk → Web adapter
- `bootstrap()` từ `@osiris-smarttv/device`

## Dual pane trên PS5 — kết luận lab

Trên PS5 FW 13 WebView đã chứng minh:

| Cách | Kết quả |
|------|---------|
| 2× Shaka MSE | 3015 sau khi cả hai `playing` |
| Shaka + MP4 native | left 3015 ngay khi right start |
| `captureStream` | **không có** |
| canvas `drawImage(video)` từ MSE | frame **đen** |
| WebCodecs `VideoDecoder` | **không có** |
| TinyH264 / bất kỳ WASM soft-decode | **`WebAssembly` không có** |

⇒ Runtime này chỉ chịu **1 HW video decoder**, và **không** soft-decode được (no WASM / WebCodecs).

**Mặc định an toàn** `DUAL_MODE = 'shaka-telemetry'`:
- **left:** Shaka MSE (decode thật)
- **right:** poster + telemetry từ cùng `<video>` (không decoder 2)

Muốn 2 stream thật: **swap source trên 1 Shaka** (không simultaneous).

Mode thí nghiệm (sẽ fail trên PS5): `shaka-webcodecs` | `shaka-mp4` | `shaka-canvas` | `dual-mse` | …

## Streams

Hardcode trong `src/streams.ts`.
