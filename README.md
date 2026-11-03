# ながら放送

Slackのスレッドを探さず、朝の音声を開いてすぐ聴くためのローカルプロトタイプ。Node.js 22以上で動作し、実行時に外部サービスのアカウントやAPIキーは不要です。UIは指定のNotionデザインシステムを基に、FlowbiteとTailwind CSSで実装しています。

```sh
cd /Users/sintaro.katuta/dev/nagara-broadcast
npm start
```

http://127.0.0.1:4317 を開きます。停止は起動したターミナルで Ctrl+C。別ポートなら `PORT=4318 npm start`。

## 週間番組の企画

[週間番組と制作方針](docs/weekly-program-plan.md)に、曜日ごとの番組と制作方針をまとめています。現在の配役と自動制作の運用は [週間自動制作・公開](docs/delivery/weekly-cloud/operations.md) を参照してください。

## デザインとFlowbite MCP

配色・文字・余白は [DESIGN.md](DESIGN.md) にまとめています。ネイビーの中央揃えヒーロー、紫の主要操作、白い最新エピソードカード、黄色のチャンネル案内、パステルのチャンネルカードを使用。ボタンは角丸8px、カードは12pxです。1024px未満ではメニューを折りたたみ、スマートフォンでは44px以上の主要操作領域を確保しています。Notion Sansは配布ファイルが提供されていないため同梱せず、指定されたフォールバック順で表示します。

Flowbite 4.0.2 + Tailwind CSS 4.3.0を使用しています。横型ナビゲーション、最新MP3の特集、チャンネル別カバー、実際の再生キュー、保存容量画面、常設プレーヤーを用意しています。最新の通常エピソードを特集し、通常の音声がなければ試聴サンプルを表示します。

利用者向けの画面から開発構成や内部パスを取り除き、検索の解除、空の状態からの音声追加、保存結果の通知を整えました。音声がないときは特集やチャンネル棚を隠し、追加する操作を案内します。スマートフォンの主要な再生・保存操作は44px以上で、一覧の長さと出典も確認できます。

編集元は `src/styles.css`、`public/index.html`、`public/app.js`。CSSとFlowbiteのブラウザ用JSはローカルにビルドして同梱しています。起動だけならnpm依存のインストールは不要です。

```sh
npm ci
npm run build
```

`npm run build` は `public/styles.css` と `public/flowbite.js` を生成します。CSS編集中は別ターミナルで `npm run dev:css`、サーバーは `npm start`。Flowbiteのバージョンを更新したときは必ずフルビルドしてください。ライト・ダーク・端末に合わせる、の3設定を同じブラウザに保存します。

公式Flowbite MCP 1.1.5をインストールし、Codexへ `flowbite` 名で登録済みです。ライセンスキーは不要で、Figma接続は使用していません。接続先はこのプロジェクトの `node_modules/flowbite-mcp/build/index.js` なので、フォルダーを移動した場合はCodex設定のパスも更新してください。`.codex/config.toml` にもプロジェクト用設定を残しています。

```sh
codex mcp get flowbite
npm run mcp:context
```

`mcp:context` は公式MCPへ実際にSTDIO接続し、部品の資料と `generate-theme` の応答を `docs/delivery/flowbite/mcp/` に保存します。今回もこの経路で資料を取得し、配色設計に利用しました。MCPは開発用で、サイト利用者や再生処理からは呼び出しません。Codexの通常ツールとして設定がまだ反映されていなければ、新しいCodexセッションで開いてください。

[Flowbite公式MCP](https://flowbite.com/docs/getting-started/mcp/) / [公式リポジトリ](https://github.com/themesberg/flowbite-mcp)

## 試せること

- 技術、暮らし、コメディ、ニュースの4チャンネル。検索、並び替え。
- MP3追加フォーム、ドラッグ＆ドロップ（100 MiBまで）。音声と番組情報はディスクに保存。
- 再生・一時停止・シーク・15秒スキップ・倍速・音量・連続再生。ページ内の移動中も再生を継続。
- あとで聴く、再生履歴、エピソードごとの途中位置（同じブラウザのlocalStorage）。
- MP3ダウンロード、RSS `/feed.xml`（ローカルURLのため、通常画面には表示していません）。
- 音声の長さ・音質・追加本数・保存日数から必要な容量を試算。保存日数は試算用で、自動削除設定ではありません。Cloudflareの構成や無料枠の説明はこのREADMEにまとめています。
- スマートフォン幅の画面。再生速度もスマホから変更できます。
- 再生中の一覧に従う「次に聴く」キュー。途中で別画面へ移動しても再生順を維持します。

4本の日本語デモは約30〜33秒のオリジナル台本です。macOS内蔵のKyokoで合成した試聴音声で、30分の完成番組や最新ニュースではありません。アップロード動作確認用の複製サンプルが1本入っています。

## AivisSpeechで二人のラジオを作る

今後の音声制作はAivisSpeech本体に付属するローカルEngineへ統一します。阿井田 茂とまおのAIVMXを別々の話者として指定し、台詞ごとに切り替えます。話速は0.95です。

```sh
~/Applications/AivisSpeech.app/Contents/Resources/AivisSpeech-Engine/run --host 127.0.0.1 --port 10101
```

別ターミナルで生成します。

```sh
cd /Users/sintaro.katuta/dev/nagara-broadcast
npm run radio:generate -- examples/yorimichi-ep01.json --program --output output/yorimichi-ep01.mp3
```

`--program` はOP、フリートーク、お便り、曲・案内、EDの構成と、控えめなジングル・BGM・オリジナル曲を加える番組制作です。台詞や音素材、実測の時刻付き台本は `出力.mp3.production/` に残ります。音編集はPython標準ライブラリとffmpegだけで行います。

`--ingest` を付けると完成した音声を起動中のサイトへ追加します。既存ファイルは上書きしないため、再生成時は別の出力名を指定してください。台本JSONの `voices` に話者UUID・名前・スタイル名、`turns` に `speaker`・`text`・任意の `pauseMs` を並べます。スタイルIDは `/speakers` から実際に取得し、`/audio_query` → `/synthesis` でWAVを生成します。指定した2人のモデルが不足していたり同じ話者だったりする場合は停止します。短い会話だけを作る場合は、以前の `examples/morning-conversation.json` と `--program` なしの生成方法も利用できます。

本体・モデルの配布元、利用条件、起動や復旧の手順は [AivisSpeech運用メモ](docs/delivery/aivis/operations.md) にまとめています。合成はPC内のHTTP APIだけを使用します。自動記事取得は未接続です。

最新の完成番組「茂とまおのよりみちラジオ #01｜小さな遠回り」は5分9秒・3.72 MB。[MP3](output/yorimichi-ep01.mp3)、[時刻付き台本](docs/delivery/radio-program/script.md)、サイトの最新エピソードから確認できます。[番組制作の検証結果](docs/delivery/radio-program/verification.md)

実生成した試作「朝の散歩は、目的地なしで」は約1分40秒・1.20 MB。`output/morning-conversation.mp3` とサイトの同名エピソードから聴けます。これはAivisSpeechで生成した二人会話で、前からあるKyokoの試聴デモはそのまま残しています。[実生成と再生の確認結果](docs/delivery/aivis/verification.md)

過去のIrodori試用結果は [比較記録](docs/delivery/irodori/verification.md) に保存しています。ユーザーの聴き比べ結果を受け、今後の番組はAivisSpeechで制作します。比較用MP3は履歴として残しています。

## いまの音声生成処理から追加する

既存のローカルTTSがMP3を書き出したあと、次のコマンドを実行すれば、Slackへ送る代わりにサイトへ追加できます。サーバーを起動してから実行してください。

```sh
cd /Users/sintaro.katuta/dev/nagara-broadcast
npm run ingest -- /absolute/path/to/radio.mp3 tech "今日の技術ラジオ" "今日の話題と出典の説明"
```

チャンネルIDは `tech` / `life` / `comedy` / `news`。ffprobeがあれば再生時間を自動取得します。ない場合も追加・再生でき、一覧の時間は0:00で登録されます。`RADIO_URL=http://127.0.0.1:4318` で別のローカルポートを指定できます。

直接HTTPでも追加できます。

```sh
curl --fail-with-body -X POST \
  'http://127.0.0.1:4317/api/episodes?title=Morning%20radio&channel=tech&duration=1800' \
  -H 'Content-Type: audio/mpeg' \
  --data-binary @/absolute/path/to/radio.mp3
```

任意の `description`、`source`（http/httpsの出典URL）もクエリに指定できます。成功時は201とエピソードJSONを返します。同じMP3をもう一度送ると別エピソードとして追加します。

朝の自動制作と公開の手順は [運用メモ](docs/delivery/weekly-cloud/operations.md) を参照してください。記事の自動取得は実装していません。

## データと復旧

- `data/episodes.json`：タイトル、チャンネル、説明、日時、サイズ、再生時間、出典。
- `data/audio/*.mp3`：実際の音声。
- `data/demo-*.txt` / `.aiff`：試聴サンプルの台本と中間音声。
- ブラウザlocalStorage `yr:*`：お気に入り、再生履歴、再生位置。

バックアップはサーバーを止め、`data/` 全体をコピーしてください。復旧は停止中にそのコピーを `data/` に戻し、`npm start`。JSONが壊れている場合は上書きせず起動エラーになります。同じデータディレクトリに対して複数プロセスを起動しないでください。

サンプルを作り直す場合は、サーバー停止中に `npm run demo`。macOSの `say` と `/opt/homebrew/bin/ffmpeg`、`ffprobe` が必要です。既存のサンプルIDはスキップします。実際のMP3利用にはこれらのツールは不要です。

## Cloudflareで公開するなら

この版は127.0.0.1のみで待ち受けます。Cloudflareへのアップロード・デプロイは行っていません。画面はそのまま静的配信に利用できますが、NodeサーバーをPagesに置くだけでは追加APIは動きません。

公開版は **Workers 静的アセット（画面） + R2 Standard（MP3） + Workers（一覧・追加APIとRange配信） + D1（番組情報）**。アップロードAPIは認証し、公開 RSS と音声URLは HTTPS で提供します。Podcastサービスへの登録は未検証です。

2026-10-21確認時点のR2 Standardは月10 GB-month、Class A 100万回、Class B 1,000万回が無料枠。インターネットへの転送料は無料です。無料枠超過は有料で、容量だけでなく操作回数も対象です。

| 30分のMP3 | 1本 | 4本/日 × 90日 | 10 GBに入る日数の目安 |
| --- | ---: | ---: | ---: |
| 64 kbps | 14.4 MB | 5.184 GB | 173日 |
| 128 kbps | 28.8 MB | 10.368 GB | 86日 |

概算式：`秒数 × kbps × 1000 ÷ 8`。GBは10進、MP3ヘッダーの小さな差は除外。10 GBは月平均の保存量に対する無料枠です。表の日数は保存量の目安で、無料請求の保証ではありません。長く運用する場合は90日等の保存期間を決め、R2のライフサイクルルールを別途設定します。

[Cloudflare R2公式料金](https://developers.cloudflare.com/r2/pricing/) / [Pages公式制限](https://developers.cloudflare.com/pages/platform/limits/)（Pagesの1ファイル上限は25 MiB。音声はR2へ置く方針）。

## 検証

```sh
npm test
node --check server.mjs
node --check public/app.js
```

自動テストは保存・再起動後の復元・並行追加・部分取得・不正入力・RSSエスケープ・容量計算を検証します。初版の確認結果は [verification.md](docs/delivery/prototype/verification.md)、daisyUI版は [移行時の確認結果](docs/delivery/daisyui/verification.md)、Flowbite移行は [移行時の確認結果](docs/delivery/flowbite/verification.md)、利用体験の整理は [最新の確認結果](docs/delivery/usability/verification.md)。
