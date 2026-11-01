# ローカル運用とMCP

起動は`npm start`、URLはhttp://127.0.0.1:4317。サーバーの静的配信パスを変更したため、この変更ではサーバーを再起動した。現在の検証サーバーは起動したまま引き渡す。

編集前に`npm ci`、編集後に`npm run build`。生成済みのpublic/styles.cssとflowbite.jsは直接編集しない。HTMLと画面JSにクラスを追加した場合もビルドする。CSSだけの監視は`npm run dev:css`、Flowbite更新時はフルビルドが必要。

MCPはCodexに`flowbite`名でグローバル登録済み。commandは/opt/homebrew/bin/node、引数はこのプロジェクトのnode_modules/flowbite-mcp/build/index.jsと--mode stdio。APIキーや環境変数は設定していない。確認は`codex mcp get flowbite`。新しいCodexセッションで通常のツールとして利用できる設定。

`npm run mcp:context`で単独のMCPクライアントからも接続できる。カタログと実際のテーマ応答をこのフォルダーのmcp/へ保存する。Figmaの変換機能は未使用で、Figma認証情報は取得していない。

テスト用の`scripts/preview-fixture.mjs`は4318番に空の一時ライブラリを作る。Ctrl+Cでサーバーとその一時データを削除する。利用中のdata/と別にMP3追加を検証するために使用し、確認後に停止済み。

旧画面のコピーはbefore/。画面を戻す場合は停止中にbefore/index.html、app.js、favicon.svgをpublic/へ、before/compiled.cssをpublic/styles.cssへ戻す。旧ソースで編集するならbefore/styles.cssをsrc/styles.cssへ戻し、daisyUI依存の復元も必要になる。音声data/を上書きしない。サーバーの追加静的パスは旧画面にも影響しない。

Flowbite MCPの登録を削除したい場合は`codex mcp remove flowbite`。プロジェクト内.codex/config.tomlの設定も併せて確認する。今回、公開や自動スケジュールの登録は行っていない。
