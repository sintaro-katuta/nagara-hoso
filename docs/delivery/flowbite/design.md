# 設計

画面は音声メディア型へ変更。上部に横型ナビゲーション、中央に最新MP3の特集、その下に4つの番組カバー、下段に検索付き一覧と再生キューを置く。容量管理は専用画面、プレーヤーは下端。旧サイドバーと卓上ラジオのイラストは使用しない。

配色：Paper #f6f8fa、Ocean #183440、Sky #a9d5df、Coral #ff805a、Blue #134fd2、Moss #577e67。見出しはAvenir Next/Hiragino、カバー文字はArial Black、日付と時間はSFMono。イラストは電波・葉・笑顔・地球を元にしたオリジナルSVGと、音声の軌道を表すCSS。外部画像・フォントを取得しない。

Flowbite 4.0.2 + Tailwind 4.3.0。公式MCP 1.1.5へSDK 1.32.1でSTDIO接続し、72リソースのカタログ、buttons/cards/navbar/modal/forms/tabsの資料を取得。`generate-theme`を実行し、そのブランド配色からテーマを構成した。応答中のCSSに二重の@themeが含まれたため、そのままコピーせず必要な変数を整理して使用した。

UIはFlowbiteのセマンティック変数と部品例を元にし、アップロードは実際のFlowbite Modalを使用する。モーダル表示中は背景をinertにしてフォーカスを移し、Tabを範囲内で循環させ、閉じると元のボタンへ戻す。

`scripts/build.mjs`がCSSをコンパイルし、Flowbiteのブラウザ用JSをpublic/へコピーする。サーバーには`/flowbite.js`と`/player-model.js`の静的配信を追加。保存・Range配信・RSSの処理は維持する。

キュー生成と次曲取得は`public/player-model.js`へ分離。選択したエピソードが検索/絞り込み結果にあればその順番、結果外の特集からなら全体の順番で作る。画面内移動ではキューを作り直さず、右の予定と自動次曲を同じデータで駆動する。重複を除き、末尾でループしない。

既存localStorage `yr:saved` / `yr:history` / `yr:positions`は継続。新しい表示設定は`yr:appearance`。旧daisyUIテーマ設定は使用しない。音声のデータ移行はない。

要件1→npm/MCP記録、2→HTML/CSS全面改訂、3→既存APIと回帰試験、4→load/featured判定、5→player-model/テスト/実再生、6→テーマ/ブレークポイント/README。
