/** Draw I420 (YUV420 planar) frame onto a 2D canvas. */
export function drawI420ToCanvas(
  ctx: CanvasRenderingContext2D,
  yuv: Uint8Array,
  width: number,
  height: number,
): void {
  if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
    ctx.canvas.width = width
    ctx.canvas.height = height
  }
  const image = ctx.createImageData(width, height)
  const rgba = image.data
  const ySize = width * height
  const cSize = ((width + 1) >> 1) * ((height + 1) >> 1)
  const yPlane = yuv.subarray(0, ySize)
  const uPlane = yuv.subarray(ySize, ySize + cSize)
  const vPlane = yuv.subarray(ySize + cSize, ySize + 2 * cSize)
  const cw = (width + 1) >> 1

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const y = yPlane[j * width + i]!
      const u = uPlane[((j >> 1) * cw + (i >> 1))!]! - 128
      const v = vPlane[((j >> 1) * cw + (i >> 1))!]! - 128
      // BT.601
      let r = y + 1.402 * v
      let g = y - 0.344136 * u - 0.714136 * v
      let b = y + 1.772 * u
      const p = (j * width + i) * 4
      rgba[p] = r < 0 ? 0 : r > 255 ? 255 : r
      rgba[p + 1] = g < 0 ? 0 : g > 255 ? 255 : g
      rgba[p + 2] = b < 0 ? 0 : b > 255 ? 255 : b
      rgba[p + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}
