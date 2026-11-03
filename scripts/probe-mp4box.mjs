import { createFile, MP4BoxBuffer } from 'mp4box'

const url =
  'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/v-0144p-0100k-libx264.mp4'
const ab = await fetch(url).then((r) => r.arrayBuffer())
console.log('bytes', ab.byteLength)

const file = createFile()
await new Promise((resolve, reject) => {
  file.onError = (e) => reject(e)
  file.onReady = (info) => {
    console.log(
      'tracks',
      info.tracks.map((t) => ({
        id: t.id,
        codec: t.codec,
        type: t.type,
        w: t.video?.width,
        h: t.video?.height,
        nb_samples: t.nb_samples,
      })),
    )
    resolve(info)
  }
  file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(ab, 0))
  file.flush()
})
