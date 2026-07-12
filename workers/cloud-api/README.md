# Cloud API Worker

GitHub トークンをブラウザに載せないための Cloudflare Worker です。

## ローカル

```bash
# 一度だけ
npx wrangler login
cd workers/cloud-api
npx wrangler secret put GH_TOKEN   # Contents + Issues 付き PAT
npx wrangler deploy
```

デプロイ後の URL（例: `https://terraria-companion-api.<account>.workers.dev`）をリポジトリ Variable `CLOUD_API_URL` に設定し、Pages を再デプロイする。

## Actions

Secret: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUD_API_GITHUB_TOKEN`  
Variable: `CLOUD_API_URL`
