# AGENTS.md

このリポジトリで作業する AI エージェント向けの指針です。

## プロジェクト要約

- **名前**: テラリア コンパニオン（非公式 Terraria 進行管理 PWA）
- **製作者**: [nezumi0627](https://github.com/nezumi0627)
- **ライセンス**: MIT（`LICENSE`）
- **UI 言語**: 日本語（`lang="ja"`）
- **形態**: モバイル幅（`max-w-md`）のシングルページ。ルーティングはタブ + オーバーレイスタック
- **パッケージマネージャ**: pnpm
- **公開**: GitHub Pages（`nezumi0627.github.io/<repo>`）。`output: 'export'` + Actions デプロイ

## 起動

```bash
pnpm install
pnpm dev
```

本番（静的エクスポート）確認は `pnpm build`（成果物は `out/`）。  
Node サーバー起動（`pnpm start`）は静的エクスポート構成では使わない。

## アーキテクチャ（触る場所）

| 関心事 | 場所 |
| --- | --- |
| 画面タブ | `components/screens/*`、切替は `lib/ui-store.ts` |
| 詳細 UI | `components/detail/*`（`OverlayHost` がスタック表示） |
| シェル | `components/app-shell.tsx` |
| 進捗・設定の永続化 | `lib/store.ts`（IndexedDB） |
| ゲームデータ API | `lib/data/index.ts`（検索・ツリー・チェックリスト） |
| 拡張データ読込 | `loadExtendedData()` + `lib/data-status.ts` |
| Wiki テキスト抽出 | `scripts/lib/wiki-parse.mjs` + `pnpm data:refresh-text` |
| 説明サニタイズ | `lib/sanitize-text.ts`（`scripts/clean-public-descriptions.mjs` と整合） |
| フィードバック → Issue | `lib/feedback.ts` + 設定画面の `FeedbackForm`（Worker 経由） |
| クラウド API | `workers/cloud-api/` + `lib/cloud-api.ts`（GitHub トークンは Worker 側のみ） |
| 公開 URL 接頭辞 | `lib/public-url.ts`（GitHub Pages の `basePath`） |
| 型 | `lib/data/types.ts` |
| スタイル変数 | `app/globals.css` |
| Pages デプロイ | `.github/workflows/deploy-pages.yml` |

データ結合ルール:

1. 起動時はキュレート済みのみで描画（巨大 Wiki TS をバンドルしない）
2. `public/data/*.json` を fetch 後、Wiki を先に入れてキュレートで上書き（**キュレート優先**）
3. ボスの進行タイムラインは `order > 0 && order < 100` のみ
4. UI は `useDataStatus().version` を依存に入れて再描画する
5. `fetch` / スプライト / SW のパスは必ず `publicUrl()` 経由（Pages の basePath 対策）

## コーディング方針

- 既存のパターン・命名・インポート（`@/`）に合わせる。無関係なリファクタやファイル追加はしない
- UI はクライアントコンポーネント中心（`"use client"`）。新しい画面も `AppShell` のタブ or オーバーレイに載せる
- 状態:
  - **永続化するユーザー進捗** → `useStore`（`lib/store.ts`）
  - **一時 UI（タブ・スタック）** → `useUi`（`lib/ui-store.ts`）
- アイコン表示は `GlyphTile` / `iconSrc()`。スプライト欠落時はグリフにフォールバックする前提を崩さない
- shadcn コンポーネントは `components/ui/`。見た目トークンは既存の CSS 変数・テーマ（grass 等）を使う
- `next.config.mjs` の `ignoreBuildErrors` / `images.unoptimized` / `output: 'export'` は意図的。変更する場合は理由を明示する

## データ・スクリプト作業時

- 巨大データは `public/data/*.json`。手で大量編集せず `scripts/` + `pnpm data:*` で更新する
- 壊れた説明・名前の再生成は `pnpm data:refresh-text`（bad-only rebuild → merge → clean-public）
- 全同期は `pnpm data:sync`（出力は JSON。クライアントに巨大 TS を戻さない）
- キュレートしたい個別エンティティは `lib/data/items.ts` / `enemies.ts` / `world.ts` に書く（マージで勝つ）
- 説明文のサニタイズは `lib/sanitize-text.ts` と整合させる
- `catalog.json` はツール用。アプリ UI からは参照しない

## クラウドログイン（ID + 数字4桁）

- 設定 → アカウントで **新規登録 / ログイン**
- 認証情報: **ID（英数字 3〜24）** + **数字4桁**
- 保存先: リポジトリ内 `users/{id}.json`（クラウド API が GitHub Contents API で commit）
- PIN はクライアントで SHA-256 し、ファイルにもハッシュのみ保存
- 未ログイン時は従来どおり端末の IndexedDB
- ログイン中は変更をデバウンスしてクラウドへ同期（`CloudSyncHost`）
- `users/**` / `workers/**` だけの変更では Pages を再デプロイしない

### なぜサーバ経由か

静的 GitHub Pages に `NEXT_PUBLIC_*` で PAT を入れると JS から抜かれる。  
API（Cloudflare Worker または Actions + Quick Tunnel）が GitHub トークンを持ち、ブラウザは API URL だけ知る。

### 稼働モード

1. **推奨（恒久）**: `workers/cloud-api` を Cloudflare Workers にデプロイし Variable `CLOUD_API_URL` を設定
2. **アカウント不要**: `.github/workflows/cloud-api-tunnel.yml` が Quick Tunnel で API を公開し、`public/cloud-api-url.json` を更新。アプリは起動時にその URL を読む

### 必要な Secret / Variable

| 名前 | 場所 | 用途 |
| --- | --- | --- |
| `CLOUD_API_GITHUB_TOKEN` | Actions Secret | API 用 GitHub PAT（Contents + Issues） |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | Actions Secret（任意） | Worker 恒久デプロイ時のみ |
| `CLOUD_API_URL` | Actions Variable（任意） | Pages ビルドに焼き込む恒久 Worker URL |

公開リポジトリのため、進行 JSON 自体は誰でも読めます（簡易クラウド用途の前提）。

## GitHub Pages

- `main` への push で Actions が `out/` をデプロイする
- 初回は Settings → Pages → Source を **GitHub Actions** にする
- `public/.nojekyll` 必須（`_next` 配信のため）

## やってはいけないこと

- Terraria 公式アセットの権利を無視した再配布方針の変更
- 進捗データの破壊的マイグレーションを、移行・リセット UX なしで入れること
- `node_modules` / `.next` / `out` / 取得 zip などをコミットすること
- GitHub トークンを `NEXT_PUBLIC_*` や静的バンドルに入れること（Worker Secret に置く）
- ユーザーが求めていない README・ドキュメントの追加改変、スコープ外リファクタ

## 変更時の確認

- 画面遷移（タブ切替・Escape でオーバーレイ閉じ）が壊れていないこと
- 目標追加（最大 3）・所持数・ボス撃破トグルが persist 後も残ること
- 検索（日本語名・読み・英語）が主要なアイテムでヒットすること
- スプライト無しエンティティでも UI が崩れないこと
- GitHub Pages（basePath 付き）で Wiki JSON / スプライトが 404 にならないこと
- 設定のフィードバック送信が Issue 作成または New issue 画面起動になること
