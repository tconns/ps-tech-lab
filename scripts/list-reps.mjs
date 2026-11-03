const t = await fetch(
  'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd',
).then((r) => r.text())
for (const m of t.matchAll(
  /<Representation\b([^>]*)>[\s\S]*?<BaseURL>([^<]+)<\/BaseURL>/g,
)) {
  const attrs = m[1]
  const url = m[2]
  if (!/video|avc|height=/i.test(attrs + url)) continue
  console.log(attrs.replace(/\s+/g, ' ').trim(), '=>', url)
}
