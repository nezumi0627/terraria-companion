import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

let n = 0
for (const f of await readdir('data/wiki')) {
  if (!f.endsWith('.json') || f === 'index.json') continue
  const p = join('data/wiki', f)
  const data = JSON.parse(await readFile(p, 'utf8'))
  for (const e of data.entities || []) {
    let d = e.description || ''
    const before = d
    d = d.replace(/^[A-Za-z][A-Za-z0-9 ,'"%]{0,60}(?=[ぁ-んァ-ヶ一-龥])/, '')
    d = d.replace(/<br\s*\/?>/gi, '。').replace(/<hr\s*\/?>/gi, ' ')
    d = d.replace(/。{2,}/g, '。').replace(/\s+/g, ' ').trim()
    if (d !== before) {
      e.description = d
      n++
    }
  }
  await writeFile(p, JSON.stringify(data, null, 2))
}
console.log('desc polish', n)
