import { readFileSync } from 'fs'

const curated = readFileSync('lib/data/items.ts', 'utf8')
const wiki = readFileSync('lib/data/wiki-items.ts', 'utf8')
const pets = JSON.parse(readFileSync('data/wiki/pets.json', 'utf8'))

function snippet(src, id) {
  const i = src.indexOf(`id: '${id}'`)
  if (i < 0) return 'MISSING'
  return src.slice(i, i + 260).replace(/\s+/g, ' ')
}

const d = pets.entities.find((e) => e.id === 'the-dirtiest-block')
console.log('pets.json:', d?.name, d?.aliases)
console.log('curated:', snippet(curated, 'the-dirtiest-block'))
console.log('wikiItems count:', (wiki.match(/id: '/g) || []).length)
console.log('has 至高 in curated:', curated.includes('至高の土'))
console.log('has 志向 alias:', curated.includes('志向の土'))

const files = [
  'blocks.json',
  'misc.json',
  'furniture.json',
  'vanity.json',
  'walls.json',
  'dyes.json',
  'ores.json',
  'new-145.json',
]
for (const f of files) {
  const j = JSON.parse(readFileSync(`data/wiki/${f}`, 'utf8'))
  console.log(f, 'entities', j.entities?.length || 0)
}
