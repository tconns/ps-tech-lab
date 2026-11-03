# PS Tech Lab

PlayStation TechLab — dual Shaka Player (split screen), nền đen. Deploy Docker → Dokploy.

## Dev

```bash
npm install
npm run dev
```

## Docker Compose

```bash
docker compose up --build
```

Mở http://localhost (port 80). Chi tiết service trong `docker-compose.yml`.

## Dokploy

Dùng loại **Docker Compose** + file `docker-compose.yml`. Xem [docs/DOKPLOY.md](docs/DOKPLOY.md).

## Streams

Hardcode trong `src/streams.ts` (Google / Shaka demo DASH).
