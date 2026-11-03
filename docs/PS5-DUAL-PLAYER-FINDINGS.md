# PS5 dual-player lab findings

**Device:** PlayStation 5, firmware **13.00**  
**Runtime:** PS5 WebView (`window.msdk` present), UA WebKit/Safari 17-class  
**App:** `ps-tech-lab` (Shaka Player + `@osiris-smarttv/device` bootstrap)  
**Date:** 2026-11-03

## Goal

Chạy **hai luồng video đồng thời** (dual pane): player chính Shaka + preview/player phụ.

## Environment confirmed

- Platform detect: `ps5`, `isPs5Runtime: true`, `hasMsdk: true`
- MSDK preload: OK (`msdk is already loaded`)
- Single Shaka MSE + strip-audio DASH: **play ổn định**

## Experiments and results

| # | Approach | Result |
|---|----------|--------|
| 1 | **2× Shaka MSE** (DASH, strip audio, start tuần tự) | Cả hai lên `playing`, sau đó lặp **Shaka 3015** `MEDIA_SOURCE_OPERATION_THREW` (`Media failed to decode`) trên cả hai pane |
| 2 | **Shaka + native progressive MP4** (không MSE thứ 2) | Ngay khi right `set src`, **left 3015**; right thường `videoWidth: 0` rồi `Media failed to load` |
| 3 | **Shaka + native HLS** (blob master) | `NotSupportedError` / media error code 4; left cũng có thể 3015 |
| 4 | **Canvas `drawImage(shakaVideo)`** | `drawImage` không throw nhưng **pixel probe = black**; không mirror được MSE frames |
| 5 | **`HTMLVideoElement.captureStream()`** | **API không có** trên PS5 |
| 6 | **WebCodecs `VideoDecoder`** (fMP4 → canvas) | **`VideoDecoder` not available** |
| 7 | **TinyH264 WASM** soft-decode → canvas play | **`WebAssembly` not available** (`Cannot find WebAssembly`) |

## Conclusion

Trên PS5 WebView (FW 13) dùng cho lab này:

1. Chỉ có **một hardware video decoder** dùng được với HTML media / MSE.
2. Mọi cố gắng mở **`<video>` / decode thứ hai** (MSE hoặc progressive) làm hỏng session Shaka đang chạy (3015).
3. Không có đường **soft-decode** client-side: không WebCodecs, không WebAssembly.
4. Không mirror MSE sang canvas/`captureStream`.

**Dual live video playback đồng thời là không khả thi** trong runtime này.

## What works (shipping lab mode)

- **Left:** một Shaka MSE player (DASH, audio stripped).
- **Right:** pane phụ **không decode video** — poster + telemetry đọc từ cùng `<video>` Shaka (time / size / readyState).

## Product implications

- Preview phụ dạng **player thứ 2** trên PS5 browser: **không làm được**.
- Muốn hai nội dung: phải **đổi source trên một Shaka** (swap), không simultaneous.
- Preview phụ nếu cần hình: phải đến từ **ảnh/sprite/API phía CDN** (không decode H.264 trên client), hoặc ngoài WebView.

## References (error codes)

- Shaka **3015** = `MEDIA_SOURCE_OPERATION_THREW`
- Typical payload: `{ code: 3, message: "Media failed to decode" }` + segment URL
