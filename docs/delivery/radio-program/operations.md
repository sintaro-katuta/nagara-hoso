# 生成と音編集

必要：Node.js 22以上、Python 3、ffmpeg、起動済みAivisSpeech Engine、阿井田 茂・まおのAIVMX。IrodoriのPython環境は不要。

```sh
~/Applications/AivisSpeech.app/Contents/Resources/AivisSpeech-Engine/run --host 127.0.0.1 --port 10101
```

別ターミナルで：

```sh
cd /Users/sintaro.katuta/dev/nagara-hoso
npm run radio:generate -- examples/yorimichi-ep01.json --program --output output/yorimichi-ep01.mp3
```

既存ファイル・制作フォルダーがある場合は、別の出力名を指定する。`--ingest` を付けると起動中のローカルサイトへ追加する。完了後にフォームや `npm run ingest` から追加してもよい。

再合成せず音編集だけをやり直す場合：

```sh
python3 scripts/arrange-radio.py output/yorimichi-ep01.mp3.production/manifest.json --output output/yorimichi-ep01-remix.mp3
```

`--target-seconds 300` が既定。曲の長さを12〜35秒の範囲で調整するだけで、台詞を自動カットしないため、台本によって厳密に300秒にはならない。

制作フォルダーには `manifest.json`、発言別WAV、`program-mix.wav`、`assets/`、`timeline.json`、`script.md` がある。`direction` は台本を読む人へのト書きで、合成には送らない。タイトルコールのみ `effect: title` を付ける。

生成中の失敗時はEngineの状態とログを確認する。音編集で失敗しても制作フォルダーの台詞からやり直せる。サイトの既存音声や過去の比較音声は上書きしない。バックアップは台本JSON・MP3・制作フォルダーをまとめてコピーする。朝のジョブ設定・公開先へのアップロードは今回行っていない。
