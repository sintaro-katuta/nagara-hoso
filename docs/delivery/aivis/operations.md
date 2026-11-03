# AivisSpeechの起動と生成

本体は公式の安定版1.0.0（macOS arm64）を `~/Applications/AivisSpeech.app` に配置。付属Engineを使用する。

```sh
~/Applications/AivisSpeech.app/Contents/Resources/AivisSpeech-Engine/run --host 127.0.0.1 --port 10101
```

初回は共通のBERTモデルをダウンロードする。通常はその後このMacだけで合成できる。停止は起動ターミナルでCtrl+C。GUIと付属Engineを同じポートで二重起動しない。

```sh
cd /Users/sintaro.katuta/dev/nagara-broadcast
npm run radio:generate -- examples/morning-conversation.json --output output/morning-conversation.mp3
# サイトにも追加する場合（npm startを別ターミナルで実行）
npm run radio:generate -- examples/morning-conversation.json --output output/morning-conversation-2.mp3 --ingest
```

生成は話者順に実行する。1人分のモデルがなければ停止し、他の声では代用しない。既存の出力ファイルは上書きしない。失敗しても既存ライブラリは変更しない。`--ingest` の追加だけが失敗した場合はMP3をそのままフォームや `npm run ingest` から追加できる。生成CLIはEngineを自動起動しない。

モデルの保存場所は `~/Library/Application Support/AivisSpeech-Engine/Models/`。今回取得した2件のSHA-256は公式配布情報と一致した。

| 話者 | モデルUUID | SHA-256 |
| --- | --- | --- |
| 阿井田 茂 | 47e53151-a378-46f3-abee-ce13aa07feb1 | 6dabe29de5ec2c1715e12a430805e1bff6ec64a315cccec2d26fad029df83243 |
| まお | a59cb814-0083-4369-8542-f51a29e72af7 | f87ccea2e8e2de0e0bfe52e803945af903b4086bf25621a015111628f00e4119 |

[公式ダウンロード](https://aivis-project.com/) / [付属Engineの公式手順](https://github.com/Aivis-Project/AivisSpeech-Engine) / [阿井田 茂](https://hub.aivis-project.com/aivm-models/47e53151-a378-46f3-abee-ce13aa07feb1) / [まお](https://hub.aivis-project.com/aivm-models/a59cb814-0083-4369-8542-f51a29e72af7)。

両モデルの配布ページはACML 1.0。今回の穏やかなオリジナル雑談を対象とし、モデル自体の再配布はしない。クレジットは任意で、まおの指定表記は `AivisSpeech: まお`。今後ニュースやコメディへ広げる際は、実在人物等への批判・攻撃目的の活動、特定の政治的立場への賛否を呼びかける活動などの禁止事項も確認する。[ACML 1.0全文](https://github.com/Aivis-Project/ACML/blob/master/ACML-1.0.md)

更新・復旧：サイトと合成は別プロセスのため、合成CLIを使用しなくても既存MP3の再生は継続できる。台本JSONと出力MP3をバックアップする。不要になった生成音声の扱いは利用者が判断し、既存音声・モデルをこの変更から自動削除しない。
