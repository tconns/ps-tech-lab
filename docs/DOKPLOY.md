# Hướng dẫn deploy PS Tech Lab lên Dokploy

App là SPA React (Vite) đóng gói Docker Compose: service `web` build từ `Dockerfile`, nginx lắng nghe cổng **80** trong mạng compose (không bind host port 80).

## Điều kiện

- Repo đã push lên Git (GitHub / GitLab / tương đương)
- Dokploy đã kết nối được repo đó
- Domain đã trỏ về server Dokploy (Traefik)

## 1. Tạo service Docker Compose trên Dokploy

1. Vào **Projects** → chọn project (hoặc tạo mới) → **Create Service**
2. Chọn loại **Docker Compose** (không phải Application/Dockerfile đơn)
3. Nguồn **Git** → repo `ps-tech-lab`
4. Branch: `develop` (hoặc `main`)
5. Compose file: `docker-compose.yml` (root repo)

Dokploy sẽ `docker compose build` + `up` theo file trong repo.

## 2. Port & domain

| Setting | Value |
|---------|--------|
| Service name | `web` |
| Container port | `80` |
| Protocol | HTTP |

1. Vào tab **Domains** của service
2. Thêm domain (ví dụ `techlab.yourdomain.com`)
3. Trỏ domain tới service **`web`** / port **80**
4. Bật HTTPS (Let's Encrypt) nếu có

`docker-compose.yml` chỉ `expose: "80"` — **không** map `80:80` lên host, tránh lỗi `port is already allocated` (cổng 80 thường đã dùng bởi Traefik/Dokploy).

Không cần biến môi trường cho v1 (stream hardcode trong `src/streams.ts`).

## 3. Deploy

1. **Deploy** / **Rebuild**
2. Đợi build: `npm ci` → `npm run build` → image nginx
3. Mở domain đã gắn

Kỳ vọng: màn hình đen, **2 video** chia đôi (Big Buck Bunny | Sintel).

## 4. Kiểm tra nhanh

- Refresh `/` vẫn vào được app (SPA fallback nginx)
- Console không báo lỗi Shaka load (`storage.googleapis.com` phải truy cập được)
- Trên PS5: mở trình duyệt → URL lab

## 5. Chạy local bằng Docker Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Mở [http://localhost:8080](http://localhost:8080).

Không Docker:

```bash
npm install
npm run dev
```

## 6. Đổi stream sau này

Sửa `src/streams.ts` → commit → push → Deploy lại trên Dokploy.

## Cấu trúc Compose (Dokploy)

```yaml
services:
  web:
    build: .
    expose:
      - "80"   # nội bộ; Traefik/Dokploy route domain vào đây
```

Local thêm `docker-compose.local.yml` để map `8080:80`.

## Sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| `Bind for 0.0.0.0:80 failed: port is already allocated` | Không map host port 80; dùng `expose` + Domain Dokploy (đã sửa trên `develop`) |
| Dokploy không thấy Compose | Chọn đúng loại **Docker Compose**, path `docker-compose.yml` |
| Build fail `npm ci` | Commit đủ `package-lock.json` |
| 404 khi refresh route | Kiểm tra `nginx.conf` có `try_files ... /index.html` |
| Domain không vào được | Domain phải trỏ service `web` port `80`; kiểm tra Traefik/HTTPS |
| Video không chạy | Kiểm tra mạng tới Google Storage; app đã `muted` cho autoplay |
| Màn đen mãi | Debug trên desktop trước, rồi thử PS5 |
