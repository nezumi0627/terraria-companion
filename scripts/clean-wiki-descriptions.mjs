/**
 * Clean description fields in data/wiki/*.json (strip leftover templates).
 * Usage: node scripts/clean-wiki-descriptions.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')

function clean(desc, name, enName) {
  let t = String(desc || '')
  // repeatedly strip simple templates
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === t) break
    t = next
  }
  t = t
    .replace(/Category:[^\s]+/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\|[a-zA-Z]+\s*=\s*[^|}]*/g, ' ')
    .replace(/[{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Drop leading garbage like "1.2導入 武器 近接武器"
  t = t.replace(/^(?:\d+\.\d+[^\s]*導入\s*)?(?:武器|防具|アクセサリー|近接武器|魔法武器|召喚武器|遠隔武器|クラフト|ペット|マウント)\s*/g, '')
  t = t.replace(/^(?:subname|type|damage|damagetype|knockback|critical|use|tooltip|rarity|sell|autoswing|stack|research|id)\s+/gi, '')

  if (t.length < 18 || /^(Item infobox|infobox)/i.test(t)) {
    return `${name}（${enName}）。Terraria Japan Wikiより。`
  }
  return t.slice(0, 360)
}

async function main() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    let n = 0
    for (const e of data.entities || []) {
      const next = clean(e.description, e.name, e.enName)
      if (next !== e.description) {
        e.description = next
        n++
      }
    }
    await writeFile(path, JSON.stringify(data, null, 2))
    console.log(`${file}: cleaned ${n}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
