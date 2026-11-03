# Hướng dẫn deploy PS Tech Lab lên Dokploy

App là SPA React (Vite) đóng gói Docker Compose: service `web` build từ `Dockerfile`, nginx lắng nghe cổng **80**.

## Điều kiện

- Repo đã push lên Git (GitHub / GitLab / tương đương)
- Dokploy đã kết nối được repo đó
- Domain (tuỳ chọn) đã trỏ về server Dokploy

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
3. Trỏ domain tới service / port **80** (Dokploy + Traefik thường tự gắn)
4. Bật HTTPS (Let's Encrypt) nếu có

> Nếu deploy bằng Compose mà **không** gắn domain Traefik, compose đang map `80:80` trên host. Đổi port host trong `docker-compose.yml` nếu máy đã chiếm cổng 80.

Không cần biến môi trường cho v1 (stream hardcode trong `src/streams.ts`).

## 3. Deploy

1. **Deploy** / **Rebuild**
2. Đợi build: `npm ci` → `npm run build` → image nginx
3. Mở domain hoặc `http://<server-ip>` (nếu map 80)

Kỳ vọng: màn hình đen, **2 video** chia đôi (Big Buck Bunny | Sintel).

## 4. Kiểm tra nhanh

- Refresh `/` vẫn vào được app (SPA fallback nginx)
- Console không báo lỗi Shaka load (`storage.googleapis.com` phải truy cập được)
- Trên PS5: mở trình duyệt → URL lab

## 5. Chạy local bằng Docker Compose

```bash
docker compose up --build
```

Mở [http://localhost](http://localhost) (port **80**).

Nếu cổng 80 bận, tạm sửa trong `docker-compose.yml`:

```yaml
ports:
  - "8080:80"
```

Rồi mở [http://localhost:8080](http://localhost:8080).

Không Docker:

```bash
npm install
npm run dev
```

## 6. Đổi stream sau này

Sửa `src/streams.ts` → commit → push → Deploy lại trên Dokploy.

## Cấu trúc Compose

```yaml
services:
  web:          # SPA + nginx
    build: .    # Dockerfile multi-stage
    ports:
      - "80:80"
```

Chỉ một service — đủ cho lab static.

## Sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Dokploy không thấy Compose | Chọn đúng loại **Docker Compose**, path `docker-compose.yml` |
| Build fail `npm ci` | Commit đủ `package-lock.json` |
| Port 80 already allocated | Đổi host port trong `ports`, hoặc chỉ dùng Domain/Traefik |
| 404 khi refresh route | Kiểm tra `nginx.conf` có `try_files ... /index.html` |
| Video không chạy | Kiểm tra mạng tới Google Storage; app đã `muted` cho autoplay |
| Màn đen mãi | Debug trên desktop trước, rồi thử PS5 |
