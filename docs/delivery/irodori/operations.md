# 試用環境と再実行

公式ソース： https://github.com/Aratako/Irodori-TTS

取得時commit：`89f9d8fbd4d51ea019867ee1197725ede1df13c5`。

モデル： https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small-MF

専用環境は `/Users/sintaro.katuta/dev/irodori-tts`。Python 3.11.17、PyTorch 2.10.0、公式uv.lockの依存を `uv sync --extra cpu --python 3.11` で導入した。macOSのcpu extraは標準PyTorchを入れるため、MPSも選択できる。標準のPython環境やラジオサイトのnpm依存は変更しない。

```sh
cd /Users/sintaro.katuta/dev/nagara-hoso
../irodori-tts/.venv/bin/python scripts/try-irodori.py \
  examples/irodori-conversation.json \
  --output output/irodori-conversation.mp3
```

初回はHugging FaceからTTS・codec等のモデルを取得する。合成そのものはこのMacで行い、台本や参照音声をクラウドの合成APIへ送らない。再実行するときは異なる出力名を指定する。既存ファイルは上書きしない。

`--device cpu --codec-device cpu` でCPUを明示できる。MPSが利用できない場合、スクリプトは黙ってCPUへ切り替えず停止する。モデル読み込みや合成中に失敗した場合、生成途中のWAVを出力フォルダー内の `irodori-*` に残す。MP3生成完了時には同フォルダーにmanifest.jsonを保存する。

完成した音声をサイトに追加する場合：

```sh
npm run ingest -- output/irodori-conversation.mp3 life \
  '朝の散歩は、目的地なしで（聴き比べ）' \
  'ふみとはるが朝の散歩を話す、Irodori-TTSで作った二人の会話。'
```

モデルカードはMIT Licenseと、同意のない本人へのなりすまし等を避ける条件を掲載。今回の2声は一般的な声の特徴から新たに生成し、阿井田 茂・まおや実在人物の録音を参照にしていない。音声の自然さや一貫性は自動で保証されないため、長い番組に使う前に試聴する。

元のAivisSpeech用CLIとそのMP3は維持する。今回の比較をやめる場合も、Irodoriスクリプトを使用しなければ既存の再生・音声追加に影響しない。配信ジョブへの組み込みや公開はしていない。
