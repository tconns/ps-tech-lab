# Hướng dẫn deploy PS Tech Lab lên Dokploy

App là SPA React (Vite) đóng gói Docker: build bằng Node, serve bằng nginx cổng **80**.

## Điều kiện

- Repo đã push lên Git (GitHub / GitLab / tương đương)
- Dokploy đã kết nối được repo đó
- Domain (tuỳ chọn) đã trỏ về server Dokploy

## 1. Tạo Application trên Dokploy

1. Vào **Projects** → chọn project (hoặc tạo mới) → **Create Service** → **Application**
2. Chọn nguồn **Git** và repo `ps-tech-lab`
3. Branch: `main` (hoặc branch bạn dùng)
4. Build type: **Dockerfile**
5. Dockerfile path: `Dockerfile` (root repo)
6. Docker context: `.` (root)

## 2. Port & networking

| Setting | Value |
|---------|--------|
| Container port | `80` |
| Protocol | HTTP |

Trong Dokploy, map publish port / domain tới container port **80**. Không cần thêm env cho v1 (stream đã hardcode).

## 3. Domain (tuỳ chọn)

1. Vào tab **Domains** của application
2. Thêm domain (ví dụ `techlab.yourdomain.com`)
3. Bật HTTPS (Let's Encrypt) nếu Dokploy hỗ trợ trên server của bạn
4. Trỏ DNS A/CNAME về IP server Dokploy

## 4. Deploy

1. **Deploy** / **Rebuild** application
2. Đợi build xong (stage `npm ci` + `npm run build`, rồi copy sang nginx)
3. Mở domain hoặc `http://<server-ip>:<published-port>`

Kỳ vọng: màn hình đen, **2 video** chia đôi (Big Buck Bunny | Sintel).

## 5. Kiểm tra nhanh

- Refresh `/` vẫn vào được app (SPA fallback nginx OK)
- Console browser không báo lỗi Shaka load (stream Google phải truy cập được từ máy/PS5)
- Trên PS5: mở trình duyệt → vào URL lab

## 6. Chạy local bằng Docker (trước khi lên Dokploy)

```bash
docker compose up --build
```

Mở [http://localhost:8080](http://localhost:8080).

Hoặc không Docker:

```bash
npm install
npm run dev
```

## 7. Đổi stream sau này

Sửa file `src/streams.ts`, commit, push — Dokploy rebuild sẽ lấy URL mới.

## Sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Build fail `npm ci` | Kiểm tra `package-lock.json` đã commit |
| 404 khi refresh route | Kiểm tra `nginx.conf` có `try_files ... /index.html` |
| Video không chạy | Kiểm tra mạng tới `storage.googleapis.com`; PS5 có thể chặn autoplay unmuted — app đã `muted` |
| Màn đen mãi | Mở DevTools/remote debug xem lỗi Shaka; thử lại trên desktop trước |
