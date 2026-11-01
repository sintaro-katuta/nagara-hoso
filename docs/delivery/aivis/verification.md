# AivisSpeech検証

2026-10-22 / macOS 26.6.2 arm64 / Node.js 26 / ffmpeg 9.0.1。

## 自動検証

- `npm test`：18件成功、0件失敗。うち音声生成の10件はfetchモックで、接続先制限、別話者必須、モデル不足時の停止、実スタイルID、話速0.95、queryの他フィールド維持、HTTP/JSON/WAV異常、引数を確認。
- `node --check lib/aivis.mjs` / `scripts/synthesize-radio.mjs`：成功。
- UI側の `npm run build`、app.js構文確認、既存8件の回帰テスト：成功。

## 実Engine

1. 公式GitHubの安定版AivisSpeech 1.0.0 macOS arm64 ZIPを取得し、ユーザー用Applicationsへ展開。付属Engineの `--help` を実行。
2. 公式Hub APIから阿井田 茂とまおのAIVMXを取得。SHA-256は両方とも配布ページの値と一致。
3. Engine起動ログに両モデルが表示。初回BERT取得後、127.0.0.1:10101で起動。`lsof`でloopbackだけにLISTENすることを確認。
4. 実際の `/speakers` で阿井田 茂のノーマルIDは1310138976、まおは888753760。話者UUIDも別々。これらは検証時の値で、CLIは毎回一覧から解決する。
5. `npm run radio:generate -- examples/morning-conversation.json --output output/morning-conversation.mp3`：14発言すべて合成成功。ログで二人の交互生成を確認。
6. ffprobe：MP3 / mono / 24000Hz / 99.625958秒 / 1,196,684 bytes。ffmpegの全編デコード成功、mean_volume -17.5dB、max_volume -1.8dB。これらはvolumedetect値で、聴感品質やLUFSの測定値ではない。
7. 既存の取り込みCLIで通常のローカルライブラリへ1本追加。タイトル「朝の散歩は、目的地なしで」が特集と一覧に表示され、7本へ増加。既存6本の音声は変更していない。
8. Braveで特集から実再生し、audio.paused=false、duration=99.625958を確認。約20秒へ移動して再生継続を確認。

生成CLIの外部合成APIは使用していない。配布物と共通モデルの初回取得にはネットワークを使用した。PC内のHTTP接続と初回ダウンロードには実行環境の追加権限を使用した。

今回の受け入れ対象は短い二人会話の実生成とサイトからの再生。長時間の連日生成、自動記事取得、30分の台本生成、毎朝のスケジュール登録、一般公開は未実施。聴感の自然さについて第三者評価は行っていない。
