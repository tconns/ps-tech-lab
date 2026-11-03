import { createFile, MP4BoxBuffer } from 'mp4box'

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
console.log('nb_samples', info.tracks[0].nb_samples)
const infos = file.getTrackSamplesInfo(id)
console.log('samplesInfo', infos?.length, infos?.[0])
for (let i = 0; i < 5; i++) {
  const s = file.getTrackSample(id, i)
  console.log(i, {
    sync: s?.is_sync,
    size: s?.size,
    data: s?.data?.byteLength,
    cts: s?.cts,
    alreadyRead: s?.alreadyRead,
  })
}
