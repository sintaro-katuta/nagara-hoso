# 運用
番組画像は `public/programs/`、出演者表示は `public/programs.js` に保存する。配役を変える場合は自動制作の `lib/weekly-programs.mjs` と表示側を両方更新する。公開版の反映は `node scripts/build-cloudflare.mjs` の後、`cloudflare` で `wrangler deploy` を実行する。
