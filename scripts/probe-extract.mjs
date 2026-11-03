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
const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(file)).filter((k) =>
  /sample|extract|start|stop|seek|buffer/i.test(k),
)
console.log('methods', proto)
console.log('onSamples' in file, typeof file.setExtractionOptions, typeof file.start)

const track = info.tracks[0]
const trak = file.getTrackById(track.id)
const entry = trak.mdia.minf.stbl.stsd.entries[0]
const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN)
entry.avcC.write(stream)
console.log('avcC written', stream.byteLength, 'endian ok')

let samples = 0
file.onSamples = (id, u, s) => {
  samples += s.length
  console.log('batch', s.length, 'is_sync', s[0]?.is_sync, 'data', s[0]?.data?.byteLength)
  if (samples >= 5) file.stop()
}
file.setExtractionOptions(track.id, null, { nbSamples: 20 })
file.start()
await new Promise((r) => setTimeout(r, 3000))
console.log('extracted', samples)
