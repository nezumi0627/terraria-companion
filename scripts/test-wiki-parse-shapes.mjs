/**
 * Smoke-test name extraction against known Japan Wiki page shapes.
 */
import {
  extractJaName,
  parseEntityText,
  looksLikeBadName,
  looksLikeDescriptionSentence,
} from './lib/wiki-parse.mjs'

const copper = `{| cellpadding="5"
! {{BASEPAGENAME}}
|-
| '''タイプ''' || 道具
|-
| '''Item ID''' || 3509
|}
{{参照}}
{{パンくず3|アイテム|道具|Pickaxe}}

銅のつるはし ([http://wikiwiki.jp/trjpproject/ Terraria日本語化プロジェクト Wiki]訳)

初期から所持している銅製のツルハシ。<br>
`

const chippy = `{| align='right'
|-
!style="background:#E4F0F7;" colspan="2"|Chippy's Cloak (Inactive)
|-
| 種類 || 素材
|-
| 内部アイテムID || 5737
|}
{{参照|Wings#Inactive_Wings}}
__TOC__

Chippy's Cloak (Inactive)は[[Skeletron]](スケルトロン)の赤い帽子バリアントからドロップする動かない翼<br>

Inactive Wings はハードモード前に入手可能です。
`

const bone = `{|}
{{参照}}
{{パンくず2|アイテム|アクセサリー}}

骨のグローブ{{日本語化1.4}}<br>

[[Expert Mode]]以上の[[Skeletron]]を倒した時に出る。
ダメージは11（＋Boneの20）＝31相当。
`

const snowball = `{|
!style="background:#E4F0F7;" colspan="2"|{{BASEPAGENAME}}<br>ゆきだま
|-
| '''タイプ''' || 武器
|}
{{参照}}
[[アイテム]] > [[武器]]

{{アイテム|Snow Block}}1個から作成できる投擲武器。<br>
最序盤からお手軽に用意できる中距離用の武器になる。
`

const dartRifle = `{|}
{{参照}}
[[アイテム]] > [[武器#遠距離武器]]<br>
ダーツライフル{{日本語化1.4}}<br>
{{item|Corrupt Mimic}}がドロップする銃。<br>
上手くいけば[[Hardmode]]序盤からでも獲得できる。
`

const adamantite = `{|
! {{BASEPAGENAME}}
|-
| '''タイプ''' || 武器
|}
{{アイテム|Adamantite Bar}}でできる剣。<br>
押しっぱなしでオート攻撃可能<br>
`

const mimicDesc = `時間経過か近づくことで解除される。<br>
プレイヤーから一定以上離れると攻撃を止める。
`

const cases = [
  ['Copper Pickaxe', copper, '銅のつるはし'],
  ["Chippy's Cloak (Inactive)", chippy, "Chippy's Cloak (Inactive)"],
  ['Bone Glove', bone, '骨のグローブ'],
  ['Snowball', snowball, 'ゆきだま'],
  ['Dart Rifle', dartRifle, 'ダーツライフル'],
  ['Adamantite Sword', adamantite, 'Adamantite Sword'],
  ['Mimic prose', mimicDesc, 'Mimic prose'],
]

let fail = 0
for (const [en, wt, expect] of cases) {
  const got = extractJaName(wt, en)
  const ok = got === expect
  console.log(ok ? 'OK' : 'FAIL', en, '=>', JSON.stringify(got), 'expected', JSON.stringify(expect))
  if (!ok) fail++
  if (looksLikeBadName(got) && /[ぁ-んァ-ヶ一-龥]/.test(got)) {
    console.log('  BAD NAME FLAG')
    fail++
  }
}

const badSentences = [
  '時間経過か近づくことで解除される',
  '押しっぱなしでオート攻撃可能',
  '最序盤からお手軽に用意できる中距離用の武器になる',
  '上手くいけばHardmode序盤からでも獲得できる',
]
for (const s of badSentences) {
  if (!looksLikeDescriptionSentence(s)) {
    console.log('FAIL should reject sentence:', s)
    fail++
  }
}

const chippyParsed = parseEntityText(chippy, "Chippy's Cloak (Inactive)", 'accessory')
console.log('Chippy desc:', chippyParsed.description.slice(0, 120))
if (!/スケルトロン|動かない翼|ハードモード/.test(chippyParsed.description)) {
  console.log('FAIL Chippy description missing JP body')
  fail++
}
process.exit(fail ? 1 : 0)
