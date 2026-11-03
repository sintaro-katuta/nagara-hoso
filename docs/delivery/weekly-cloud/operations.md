# 運用

Mac のタイムゾーンを日本時間にし、ログイン状態・ネット接続・Codex の認証を維持する。Mac がスリープ・電源オフなら7時ちょうどには公開されず、起動・復帰後に当日分の処理を試す。既存の音声は公開しない。

Cloudflare は `cloudflare/wrangler.toml` の Worker・D1・R2 を使用する。フロントエンドを変更したら `node scripts/build-cloudflare.mjs` を実行後、`cd cloudflare && wrangler deploy`。認証情報は `data/weekly/upload-secret`、接続先は `data/weekly/cloud.json` に保存し Git に含めない。

稼働ログは `data/weekly/logs/`、生成物と `ready.json` / `published.json` は `data/weekly/YYYY-MM-DD/`。制作失敗時はログ、Codex 認証、AivisSpeech、空き容量、ネット接続を確認する。強制終了後の `.lock` や未検証 MP3 は他の実行が動いていないことと内容を確認してから別の場所に移す。失敗日は自動で前日分を埋め直さない。

停止は `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/local.nagara.weekly.plist`。サイトと音声エンジンの自動起動も止める場合は同様に `local.nagara.site.plist` と `local.nagara.engine.plist` を指定する。設定ファイルを削除する前にバックアップする。Cloudflare 側の停止・削除は別操作。
