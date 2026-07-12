/**
 * Quick self-check for Japan Wiki name extraction (Bone Glove pattern).
 */
import { extractJaName, looksLikeBadName, cleanName } from './lib/wiki-parse.mjs'

const boneGlove = `
{| cellpadding="5" style="border-collapse:collapse; min-width:250px; border:1px solid #888888" align="right"
|-
!style="background:#E4F0F7; color:#063B5E; font-size:120%;" colspan="2"|{{BASEPAGENAME}}
|-
! style="padding:0.5em; align:center;" colspan="2" | {{{image|[[File:{{BASEPAGENAME}}.png]]}}}
|-
!style="background:#E4F0F7; color:#063B5E; font-size:100%;" colspan="2"|情報
|-
|'''タイプ'''||アクセサリー
|-
|'''説明'''||<hr>Shoots crossbones at enemies<br> while you are attacking<br>攻撃時、敵にクロスボーンを撃つ<hr>
|-
|'''Item ID'''||3245
|}
{{参照}}
{{パンくず2|アイテム|アクセサリー}}

骨のグローブ{{日本語化1.4}}<br>

[[Expert Mode]]以上の[[Skeletron]]を倒した時に出る。

骨のDamageは25で、無系統ダメージとして扱われる。

== 1.4.1以前の仕様 ==
ダメージは11（＋Boneの20）＝31相当。
`

const name = extractJaName(boneGlove, 'Bone Glove')
console.log('extractJaName =>', JSON.stringify(name))
console.log('bad ダメージは11?', looksLikeBadName('ダメージは11'))
console.log('bad ダメージは難易度で変化?', looksLikeBadName('ダメージは難易度で変化'))
console.log('bad ダメージメーター?', looksLikeBadName('ダメージメーター'))
console.log('cleanName 骨のグローブ{{日本語化1.4}} =>', cleanName('骨のグローブ{{日本語化1.4}}'))
if (name !== '骨のグローブ') {
  console.error('FAIL expected 骨のグローブ')
  process.exit(1)
}
if (looksLikeBadName('ダメージメーター')) {
  console.error('FAIL ダメージメーター should be valid')
  process.exit(1)
}

const angel = `
{| |}
{{参照|s=Wings}}
[[アクセサリー]] > [[翼]]

天使の翼。

Wingsの1つである。
`
if (extractJaName(angel, 'Angel Wings') !== '天使の翼') {
  console.error('FAIL Angel Wings expected 天使の翼 got', extractJaName(angel, 'Angel Wings'))
  process.exit(1)
}
console.log('OK')
