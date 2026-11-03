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

## Dual player trên PS5

Hai session **Shaka MSE** trên PS5 thường lên `playing` rồi cả hai ném **3015 `MEDIA_SOURCE_OPERATION_THREW`**.

Mặc định `DUAL_MODE = 'hybrid'` trong `src/streams.ts`:
- **left:** Shaka MSE + DASH (strip audio)
- **right:** native WebKit HLS `<video>` (không MSE thứ 2), start sau khi left `playing`

Đổi mode: `hybrid` | `dual-mse` | `dual-native`.

## Streams

Hardcode trong `src/streams.ts`.
