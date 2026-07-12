import { readFileSync } from 'fs'

const acc = JSON.parse(readFileSync('data/wiki/accessories.json', 'utf8'))
const samples = [
  'magiluminescence',
  'soaring-insignia',
  'angel-wings',
  'demon-heart',
  'aglet',
  'cloud-in-a-balloon',
  'rocket-boots',
  'hermes-boots',
]
for (const id of samples) {
  const e = acc.entities.find((x) => x.id === id)
  console.log(id, '=>', e?.name)
  console.log('  ', (e?.description || '').slice(0, 100))
}
const bad = acc.entities.filter(
  (e) =>
    /<br|<hr|耐性$|可能になる|増加$|減少$|無効化/i.test(e.name || '') ||
    /<br|<hr/i.test(e.description || ''),
)
console.log('accessories bad', bad.length, 'of', acc.entities.length)
if (bad.length) console.log(bad.slice(0, 5).map((e) => e.name))

const wi = readFileSync('lib/data/wiki-items.ts', 'utf8')
console.log('wikiItems', (wi.match(/id: '/g) || []).length)
const curated = readFileSync('lib/data/items.ts', 'utf8')
console.log('has curated mag', curated.includes('magiluminescence'))
