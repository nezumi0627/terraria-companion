/**
 * Validate public/data/wiki-items.json quality after a fetch/merge.
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { looksLikeBadName, isBadDescription } from './lib/wiki-parse.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const items = JSON.parse(await readFile(join(ROOT, 'public', 'data', 'wiki-items.json'), 'utf8'))

const badNames = []
const badDescs = []
const enOnly = []
const weirdKind = []

for (const e of items) {
  if (looksLikeBadName(e.name) || /ダメージは|難易度で変化/.test(e.name || '')) badNames.push(e)
  if (isBadDescription(e.description, e.name)) badDescs.push(e)
  if (e.name && !/[ぁ-んァ-ヶ一-龥]/.test(e.name)) enOnly.push(e)
}

const expect = [
  { id: 'bone-glove', name: '骨のグローブ' },
  { id: 'copper-pickaxe', nameIncludes: '銅', allowCurated: true },
  { id: 'chippys-cloak-inactive', hasDesc: /翼|スケルトン|ハードモード|Skeletron|動かない/ },
  { id: 'angel-wings', nameIncludes: '翼' },
]

const curated = await readFile(join(ROOT, 'lib', 'data', 'items.ts'), 'utf8').catch(() => '')

const expectFails = []
for (const ex of expect) {
  let e = items.find((x) => x.id === ex.id)
  if (!e && ex.allowCurated && curated.includes(`id: '${ex.id}'`)) {
    const m = curated.match(new RegExp(`id:\\s*'${ex.id}'[\\s\\S]*?name:\\s*'([^']+)'`))
    e = m ? { id: ex.id, name: m[1], description: 'curated' } : null
  }
  if (!e) {
    expectFails.push(`${ex.id}: MISSING`)
    continue
  }
  if (ex.name && e.name !== ex.name) expectFails.push(`${ex.id}: name=${e.name}`)
  if (ex.nameIncludes && !String(e.name).includes(ex.nameIncludes)) expectFails.push(`${ex.id}: name=${e.name}`)
  if (ex.hasDesc && e.description !== 'curated' && !ex.hasDesc.test(e.description || ''))
    expectFails.push(`${ex.id}: weak desc`)
}

console.log(
  JSON.stringify(
    {
      total: items.length,
      badNames: badNames.length,
      badDescs: badDescs.length,
      enOnly: enOnly.length,
      expectFails,
      badNameSample: badNames.slice(0, 10).map((e) => `${e.id}:${e.name}`),
      enSample: enOnly.slice(0, 20).map((e) => e.name),
      copperPickaxe: items.find((e) => e.id === 'copper-pickaxe'),
      chippyInactive: items.find((e) => e.id === 'chippys-cloak-inactive'),
      chippy: items.find((e) => e.id === 'chippys-cloak'),
    },
    null,
    2,
  ),
)

if (badNames.length || expectFails.length) process.exitCode = 1
