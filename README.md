# テラリア コンパニオン

Terraria の進行を管理する非公式コンパニオン Web アプリ（PWA）。欲しい装備から必要な素材・ボス・設備・バイオームを自動で可視化し、所持・撃破・目標を端末上で一元管理できます。

**製作者:** [nezumi0627](https://github.com/nezumi0627)  
**ライセンス:** [MIT](./LICENSE)  
**GitHub Pages:** https://nezumi0627.github.io/terraria-companion/

## 必要環境

- Node.js 20+
- [pnpm](https://pnpm.io/)

## セットアップ

```bash
pnpm install
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### その他のコマンド

| コマンド | 説明 |
| --- | --- |
| `pnpm build` | 静的エクスポート（`out/`） |
| `pnpm lint` | ESLint |
| `pnpm data:sync` | Wiki 取得 → 整形 → カタログ生成 → スプライト再取得 |
| `pnpm data:refresh-text` | 壊れた名前・説明の再パース → merge → clean |
| `pnpm sprites:download` | スプライト画像のダウンロード |
| `pnpm sprites:retry` | 失敗したスプライトのみ再取得 |

## 機能概要

- **ホーム** — 目標・日次タスク・進行度
- **入手** — アイテム検索とクラフトツリー / チェックリスト
- **Wiki** — アイテム・ボス・敵・NPC・バイオーム等の閲覧
- **進行** — ボス撃破・NPC 解放・バイオーム訪問などの進捗
- **設定** — テーマ、データ入出力、**フィードバック（GitHub Issue）**、クレジット

進行データは IndexedDB（zustand persist）に保存されます。

## 技術スタック

- Next.js（App Router / static export）
- React 19 / Tailwind CSS / zustand / framer-motion

## 免責

非公式ファンメイドです。Terraria および関連商標は権利者に帰属します。
