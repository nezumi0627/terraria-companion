import { readFileSync } from 'fs'

const w = readFileSync('lib/data/wiki-items.ts', 'utf8')
const i = w.indexOf("id: 'natures-gift'")
console.log(i < 0 ? 'MISSING' : w.slice(i, i + 420))

const pets = JSON.parse(readFileSync('data/wiki/accessories.json', 'utf8'))
const e = pets.entities?.find((x) => x.id === 'natures-gift' || x.name?.includes('自然の恵み'))
console.log('json:', e?.name, e?.description?.slice(0, 200))
