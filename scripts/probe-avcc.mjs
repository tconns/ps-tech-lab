import { createFile, MP4BoxBuffer } from 'mp4box'

const ab = await fetch(
  'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/v-0144p-0100k-libx264.mp4',
).then((r) => r.arrayBuffer())
const file = createFile()
await new Promise((res, rej) => {
  file.onError = rej
  file.onReady = res
  file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(ab, 0))
  file.flush()
})
const entry = file.getTrackById(1).mdia.minf.stbl.stsd.entries[0]
const avcC = entry.avcC
console.log({
  lengthSizeMinusOne: avcC.lengthSizeMinusOne,
  sps: avcC.SPS?.map((s) => ({ nalu: s.nalu?.byteLength ?? s.length, keys: Object.keys(s) })),
  pps: avcC.PPS?.map((p) => ({ nalu: p.nalu?.byteLength ?? p.length, keys: Object.keys(p) })),
})
console.log('SPS0', avcC.SPS[0])
