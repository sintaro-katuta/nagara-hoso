# Irodori-TTS検証記録

2026-10-22 / Apple Silicon / macOS 26.6.2 / Python 3.11.17 / PyTorch 2.10.0。

## 導入・実生成

- 公式コードを専用フォルダーへ取得し、公式の `uv sync --extra cpu --python 3.11` が成功。151パッケージを専用 `.venv` に導入。
- 公式v4.1-Small-MF（約2.9 GiB）、公式codec（約410 MiB）とSilentCipherのモデルを初回取得。TTS revisionは `ccc78f5d480b6e51b69b2d5042a14c4da04fea6e`、codec revisionは `47376ee24834d7a05a48ebabfe3cde29b3c5e214`。
- 公式 `infer.py` をMPSで実行し、短文から48kHz mono・5.52秒のWAVを生成。取得とモデル読込を除く合成処理9.160秒。
- `scripts/try-irodori.py` で14発言の男女会話を生成。MPS / FP32 / MeanFlow 4ステップ。SilentCipherが利用可能で、生成ログに watermark=True を確認。
- 最初の各話者の音声を新規Voice Designで作り、残り12発言は同じ話者の初回音声を参照。声の録音素材やAivisのキャラクター音声は入力していない。
- AivisSpeech版と台詞の順番・内容が一致することをスクリプトで照合（ホスト名の茂→ふみ、まお→はるだけ置換）。
- 取得済みモデルを使った処理全体70.887秒、発言の合成・整形59.848秒、生WAV合計112.56秒。合成後の話速調整0.95と台詞間の無音を加えたMP3は120.975521秒・1,452,428 bytes・96kbps・48kHz mono。
- `ffmpeg ... -af volumedetect -f null -` で全編デコード成功。mean_volume=-17.1dB、max_volume=-1.8dB。LUFS測定や聴感評価の値ではない。
- librosa.pyinで最初の2声の有声区間のF0中央値は117.8Hz / 299.5Hz。異なる声の高さを持つことの補助確認で、話者同一性や自然さの保証ではない。

## コードと既存機能

- `python -m py_compile scripts/try-irodori.py` と `--help` が成功。
- `npm test`：既存18件成功、0件失敗。これはIrodori音質のテストではなく、従来のAPI・再生キュー・Aivisクライアントの回帰確認。
- 実行環境の制約で通常のサンドボックス内からモデル取得とMPS利用ができず、許可された追加権限で実行した。OSやGPUの保護設定は変更していない。
- PyTorchの非推奨警告、SilentCipherによる一時的な44.1kHz変換のメッセージが出たが、合成とMP3生成は成功。自動透かし機能は無効化していない。

## 出力と再生

`output/irodori-conversation.mp3`。発言別WAV・台本・seed・生成時間は `output/irodori-4lskwu_4/manifest.json` と同フォルダーに保持。

ローカルサイトへ1本追加し、ライブラリは8本。タイトルは「朝の散歩は、目的地なしで（聴き比べ）」。「朝の散歩」の検索でAivisSpeech版と2本並ぶことを確認。Braveで再生し、paused=false、duration=120.975521、約12秒へのシーク後も再生継続を確認した。「次のエピソード」でAivisSpeech版へ切り替え、duration=99.625958で再生できた。最後はIrodori版を先頭で一時停止。consoleのerror/warnは0件。画面記録はpreview.png。

今回の結果は、この台本・2声・Mac・設定での単発試用。人による比較評価、声質を一致させた比較、30分番組や連日生成の検証はしていない。
