import { createFile, MP4BoxBuffer, DataStream, Endianness } from 'mp4box'

const ab = await fetch(
  'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/v-0144p-0100k-libx264.mp4',
).then((r) => r.arrayBuffer())
const file = createFile()
const info = await new Promise((res, rej) => {
  file.onError = (e) => rej(e)
  file.onReady = (i) => res(i)
  file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(ab, 0))
  file.flush()
})
const id = info.tracks[0].id
const samples = file.getTrackSamplesInfo(id)
const sync = samples.find((s) => s.is_sync)
console.log('first sync', { n: sync.number, offset: sync.offset, size: sync.size })
const data = new Uint8Array(ab, sync.offset, sync.size)
console.log('slice bytes', data.byteLength, 'head', [...data.slice(0, 8)])

const trak = file.getTrackById(id)
const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN)
trak.mdia.minf.stbl.stsd.entries[0].avcC.write(stream)
const desc = new Uint8Array(stream.buffer, 8, stream.byteLength - 8)
console.log('desc', desc.byteLength)
