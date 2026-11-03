const START = new Uint8Array([0, 0, 0, 1])

/** Build Annex-B AU from length-prefixed AVCC sample (lengthSize = 4). */
export function avccSampleToAnnexB(sample: Uint8Array, naluLengthSize = 4): Uint8Array {
  const parts: Uint8Array[] = []
  let offset = 0
  while (offset + naluLengthSize <= sample.byteLength) {
    let naluLen = 0
    for (let i = 0; i < naluLengthSize; i++) {
      naluLen = (naluLen << 8) | sample[offset + i]!
    }
    offset += naluLengthSize
    if (naluLen <= 0 || offset + naluLen > sample.byteLength) break
    parts.push(START, sample.subarray(offset, offset + naluLen))
    offset += naluLen
  }
  return concat(parts)
}

export function parameterSetsToAnnexB(sets: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = []
  for (const set of sets) {
    parts.push(START, set)
  }
  return concat(parts)
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.byteLength, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.byteLength
  }
  return out
}
