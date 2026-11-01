# 試作方法

公式コードは別フォルダー `../irodori-tts`、Python環境はその `.venv`。ラジオ側の `scripts/try-irodori.py` が公式InferenceRuntimeを一度読み込み、台本を発言順に合成する。初回に声の説明のみで作った音声を、その話者の後続発言の参照に使う。

同じ会話内容・順序で比較し、声は固有の新規デザインとする。MeanFlow標準の4ステップ、FP32、MPSを指定。話速は合成後にffmpeg atempo=0.95で調整し、生WAVも残す。AivisSpeechのspeedScaleと同じ制御ではない。

MP3と生成時間・seed・各台詞・使用モデルの記録をローカル保存する。既存MP3を上書きせず、試作後のサイト追加には既存の取り込みCLIを使う。
