# User cloud saves

アプリの「ログイン / 新規登録」で作成される進行データです。

- ファイル名: `{id}.json`（ID は小文字）
- 認証: 数字4桁 PIN の SHA-256 ハッシュ（生 PIN は保存しない）
- 公開リポジトリのため、進行内容自体は誰でも読めます（簡易クラウド用途）

このディレクトリへの push では GitHub Pages は再デプロイされません（workflow の paths-ignore）。
