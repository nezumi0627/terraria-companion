import fs from 'node:fs'
import https from 'node:https'

const url = 'https://terraria.wiki.gg/wiki/Music'
const out = new URL('../lib/music-wiki-streams.json', import.meta.url)

function fetchText(u) {
  return new Promise((resolve, reject) => {
    https
      .get(u, { headers: { 'User-Agent': 'terraria-companion/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(new URL(res.headers.location, u).href).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
  })
}

const html = await fetchText(url)
const re =
  /data-mwtitle="([^"]+)"[^>]*>[\s\S]*?<source src="(\/images\/[^"]+\.(?:mp3|wav|ogg))/gi
const rows = []
const seen = new Set()
let m
while ((m = re.exec(html))) {
  const title = m[1]
  const src = m[2].split('?')[0]
  if (seen.has(title)) continue
  seen.add(title)
  const dur = html.slice(Math.max(0, m.index - 200), m.index).match(/data-durationhint="(\d+)"/)
  rows.push({
    mwTitle: title,
    path: src,
    url: `https://terraria.wiki.gg${src}`,
    durationHint: dur ? Number(dur[1]) : 0,
  })
}

fs.writeFileSync(out, JSON.stringify(rows, null, 2))
console.log(`wrote ${rows.length} streams → ${out.pathname}`)
for (const r of rows) console.log(`${r.mwTitle}\t${r.path}`)
