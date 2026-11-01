# 制作経路

`examples/yorimichi-ep01.json` を構成・台詞の正本とする。既存のAivisSpeech CLIに `--program` を加え、各台詞を実Engineで合成。section・direction・effect等の制作情報は発話へ渡さない。

Python標準ライブラリでオリジナルの短い音楽を合成し、24kHz monoの台詞WAVと配置する。BGMはOPとEDのみに低く入れ、フリートークとお便りの声を聴きやすくする。曲は紹介直後に入れる。タイトルコールだけに短いエコーを使う。

番組の尺に応じ、曲の長さを12〜35秒の範囲で調整する。台詞を切ったり、長い無音で5分を埋めたりしない。完成音声はffmpegで音量を整えて96kbps MP3にする。

`出力.mp3.production/` に台詞WAV、manifest、曲素材、実測timeline、タイムコード付きscript.mdを保存する。既存のMP3・制作データは上書きしない。構成の欠落や順番の誤りは合成前に停止する。
